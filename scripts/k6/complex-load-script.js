import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// ---- CONFIG ----

export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 40,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 150 },
        //{ duration: '1m', target: 250 },
        //{ duration: '1m', target: 400 },
        //{ duration: '1m', target: 600 },
        //{ duration: '1m', target: 800 },
        { duration: '10s', target: 10 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<50'], // 95% under 50ms
    http_req_failed: ['rate<0.01'],   // <1% errors
  },
};

// ---- TEST DATA ----

const movieIds = new SharedArray('movie IDs', function () {
  const file = open('./movie_ids.csv');
  return file
    .split('\r\n')
    //.slice(1) // skip header
    .filter(line => line.trim() !== '')
});

// ---- HELPERS ----

function randomMovieId() {
  return movieIds[Math.floor(Math.random() * movieIds.length)];
}

function randomUsername() {
  return `user_${Math.random().toString(36).substring(2, 10)}`;
}

function randomRating() {
  return Math.floor(Math.random() * 10) + 1; // 1–10
}

function randomComment() {
  const comments = [
    'Great movie!',
    'Not bad',
    'Could be better',
    'Loved it',
    'Terrible experience',
    'Amazing visuals',
    'Story was weak',
    'Highly recommended',
  ];
  return comments[Math.floor(Math.random() * comments.length)];
}

// ---- PER-VU STORAGE ----

let savedPairs = [];
// each element: { movieId, username }

function pickRandomSaved() {
  if (savedPairs.length === 0) return null;
  return savedPairs[Math.floor(Math.random() * savedPairs.length)];
}

// ---- USER PATHS ----

function createReview() {
    const movieId = randomMovieId();
    const username = randomUsername();

    const payload = JSON.stringify({
        movieId: movieId,
        username: username,
        rating: randomRating(),
        comment: randomComment(),
    });

    const res = http.post(
        'http://mdb-gateway:8080/api/movie-reviews',
        payload,
        { headers: { 'Content-Type': 'application/json' } }
    );

    check(res, {
        'create OK': (r) => r.status === 201,
    });

    // prevent unbounded growth
    if (savedPairs.length < 1000) {
      savedPairs.push({ movieId, username });
    }

  // ---- 30% sampling ----
  //if (Math.random() < 0.3) {
  //  ...
  //}
}

function updateReview() {
    const pair = pickRandomSaved();
    if (!pair) return;

    const payload = JSON.stringify({
        movieId: pair.movieId,
        username: pair.username,
        rating: randomRating(),
        comment: randomComment(),
    });

    const res = http.put(
        'http://mdb-gateway:8080/api/movie-reviews',
        payload,
        { headers: { 'Content-Type': 'application/json' } }
    );

    check(res, {
        'update OK': (r) => r.status === 204,
    });
}

function deleteReview() {
    const pair = pickRandomSaved();
    if (!pair) return;

    const payload = JSON.stringify({
        movieId: pair.movieId,
        username: pair.username,
    });

    const res = http.del(
        'http://mdb-gateway:8080/api/movie-reviews',
        payload,
        { headers: { 'Content-Type': 'application/json' } }
    );

    check(res, {
        'delete review OK': (r) => r.status === 200,
    });
}

// ---- TEST EXECUTION ----

export default function () {
    const rand = Math.random();

    if (rand < 0.05) {
      deleteReview();
    } else if (rand < 0.2) {
      updateReview();
    } else {
      createReview();
    }

    sleep(1);
}

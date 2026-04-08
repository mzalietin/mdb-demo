# MovieDB backend

# Component

## MovieDB - Demo Resources

### Related components

+ https://github.com/mzalietin/mdb-aggregator
+ https://github.com/mzalietin/mdb-gateway

# Task

Application that stores info about movies, users and their reviews.

<details>
  <summary>Click to expand</summary>

Movie entity:
* Name (unique), issueDate, rating (double).

User entity:
* FirstName, lastName, age, username (unique).

MovieReview entity:
* User, movie, rating (integer from 1 to 10), comment.

You have 2 main services: we can call them gateway-service and aggregator-service.
Gateway-service is the main entrance of your application. Gateway-service does not have access to your main storage (where all data is stored), however it can call some caching storage for some GET operations. It can call aggregator-service to retrieve data, it can call any service to put data. It supports the following operations:
* GET – top 10 movies with the highest rating
* GET – user info by username
* GET – top 10 favorite user movies by username
* GET – movie rating by movie name
* POST – create new movie
* POST – create new user
* POST – add new movie review
* PUT – update movie review
* DELETE – delete movie review
* DELETE – delete user (all user reviews should be also deleted in 10 minutes)

Customer requirements:
- Each new/updated/deleted movie review should affect movie rating in 5 minutes.
- You can receive up 200 movie reviews per second.
- Load balancing should be supported.
- All movie rating calculation logic should be placed inside aggregator-service.

</details>

# Design

<details>
  <summary>Click to expand</summary>

This application is a modular monolith that implements **Saga pattern with Event-Sourcing**.

The design addresses following concerns:
+ **Command-Query Responsibility Segregation (CQRS)** - aggregates which handle commands (`movie`, `movie-review`, `user`) are separated from read projection (`query-service`)
+ **Replay capability** - projection (`query-service`) can be rebuilt from event store (Kafka)
+ **Idempotent consumers** - consumers (`movie`, `movie-review`, `query-service`) are configured to handle duplicate messages in a fail-safe manner, but aim to leverage Kafka's Exactly-Once Semantics

Acknowledged but unaddressed concerns:
+ **Transactional Outbox Pattern** - would avoid dual write problem (synchronous DB + Kafka write) with potential lost events
+ **Snapshots** - avoid replaying millions of events
+ **Security**
+ **Observability**
+ **CI/CD**
+ **Unit/Integration test coverage**
+ etc. due to timebox constraints

</details>

## Architectural diagram

<details>
  <summary>Click to expand</summary>

![Alt text of the image](https://github.com/mzalietin/mdb-demo/blob/2bc910ca8fd9d656ca6ce7d569f63c5c76642277/diagram/mdb-backend.jpg)

</details>

## REST API

| Desc                        | Method | URL                                                              | Body                                                                              |
|-----------------------------|:------:|:-----------------------------------------------------------------|:----------------------------------------------------------------------------------|
| create movie                |  POST  | `http://localhost:8080/api/movies`                               | {"name":"string","releaseDate":"yyyy-mm-dd"}                                      |
| create review               |  POST  | `http://localhost:8080/api/movie-reviews`                        | {"movieId":"string","username":"string","rating":"int [1-10]","comment":"string"} |
| update review               |  PUT   | `http://localhost:8080/api/movie-reviews`                        | {"movieId":"string","username":"string","rating":"int [1-10]","comment":"string"} |
| delete review               | DELETE | `http://localhost:8080/api/movie-reviews`                        | {"movieId":"string","username":"string"}                                          |
| create user                 |  POST  | `http://localhost:8080/api/users`                                | {"username":"string","firstName":"string","lastName":"string","age":"int"}        |
| delete user                 | DELETE | `http://localhost:8080/api/users/{username}`                     |                                                                                   |
| movie rating by name        |  GET   | `http://localhost:8080/api/movies/rating?name={movieName}`       |                                                                                   |
| top movies by avg rating    |  GET   | `http://localhost:8080/api/movies/top/{limit}`                   |                                                                                   |
| top movies by user's rating |  GET   | `http://localhost:8080/api/movie-reviews/{username}/top/{limit}` |                                                                                   |
| user info by username       |  GET   | `http://localhost:8080/api/users/{username}`                     |                                                                                   |

# Run

## Start services

Prerequisites: Docker environment

`docker compose up -d`

## Run load test

Prerequisites:
+ All infra is up & running
+ Some movies created using Movies API
+ `scripts/k6/movie_ids.csv` is populated with created movie IDs

1. Uncomment K6 section in `compose.yml`
2. `docker compose up -d`

## Sample load test

### Environment

+ Rancher Desktop @ Windows
+ WSL config: 6 Gb / 6 cores
+ Simple load scenario - only HTTP POST (create review)
+ Up to 1000 req/s

<details>
  <summary>K6 output</summary>

```

2026-03-30T14:55:13.290742968Z          /\      Grafana   /‾‾/  
2026-03-30T14:55:13.290748589Z     /\  /  \     |\  __   /  /   
2026-03-30T14:55:13.290751915Z    /  \/    \    | |/ /  /   ‾‾\ 
2026-03-30T14:55:13.290754931Z   /          \   |   (  |  (‾)  |
2026-03-30T14:55:13.290757787Z  / __________ \  |_|\_\  \_____/ 
2026-03-30T14:55:13.290760672Z 
2026-03-30T14:55:13.290935228Z 
2026-03-30T14:55:13.290942532Z      execution: local
2026-03-30T14:55:13.290945698Z         script: /scripts/load-script.js
2026-03-30T14:55:13.290948113Z         output: -
2026-03-30T14:55:13.290950407Z 
2026-03-30T14:55:13.290952642Z      scenarios: (100.00%) 1 scenario, 100 max VUs, 6m40s max duration (incl. graceful stop):
2026-03-30T14:55:13.290955006Z               * load_test: Up to 1000.00 iterations/s for 6m10s over 8 stages (maxVUs: 20-100, gracefulStop: 30s)
2026-03-30T14:55:13.290957381Z 

........

  █ THRESHOLDS 

2026-03-30T15:01:24.334272686Z 
2026-03-30T15:01:24.334277636Z     http_req_duration
2026-03-30T15:01:24.334282665Z     ✗ 'p(95)<50' p(95)=318.83ms
2026-03-30T15:01:24.334288226Z 
2026-03-30T15:01:24.334293546Z     http_req_failed
2026-03-30T15:01:24.334298516Z     ✓ 'rate<0.01' rate=0.00%
2026-03-30T15:01:24.334303545Z 
2026-03-30T15:01:24.334308284Z 
2026-03-30T15:01:24.334313033Z

  █ TOTAL RESULTS 

2026-03-30T15:01:24.334317843Z 
2026-03-30T15:01:24.334322702Z     HTTP
2026-03-30T15:01:24.334327591Z     http_req_duration..............: avg=77.86ms min=3.59ms med=11.95ms max=1.32s p(90)=225.3ms  p(95)=318.83ms
2026-03-30T15:01:24.334332631Z       { expected_response:true }...: avg=77.85ms min=3.59ms med=11.95ms max=1.32s p(90)=225.29ms p(95)=318.83ms
2026-03-30T15:01:24.334337641Z     http_req_failed................: 0.00%  1 out of 120783
2026-03-30T15:01:24.334342550Z     http_reqs......................: 120783 326.413965/s
2026-03-30T15:01:24.334347469Z 
2026-03-30T15:01:24.334352249Z     EXECUTION
2026-03-30T15:01:24.334357008Z     dropped_iterations.............: 21517  58.14932/s
2026-03-30T15:01:24.334361847Z     iteration_duration.............: avg=78.16ms min=3.76ms med=12.2ms  max=1.32s p(90)=225.86ms p(95)=319.13ms
2026-03-30T15:01:24.334366857Z     iterations.....................: 120783 326.413965/s
2026-03-30T15:01:24.334371756Z     vus............................: 0      min=0           max=100
2026-03-30T15:01:24.334376726Z     vus_max........................: 100    min=20          max=100
2026-03-30T15:01:24.334381645Z 
2026-03-30T15:01:24.334386374Z     NETWORK
2026-03-30T15:01:24.334391143Z     data_received..................: 9.7 MB 26 kB/s
2026-03-30T15:01:24.334396002Z     data_sent......................: 31 MB  83 kB/s
2026-03-30T15:01:24.334402004Z 
2026-03-30T15:01:24.334429857Z 
2026-03-30T15:01:24.334432993Z 
2026-03-30T15:01:24.334653486Z 
2026-03-30T15:01:24.334662363Z running (6m10.0s), 000/100 VUs, 120783 complete and 0 interrupted iterations
2026-03-30T15:01:24.334667653Z load_test ✓ [ 100% ] 000/100 VUs  6m10s  0013.63 iters/s
2026-03-30T15:01:24.348054099Z time="2026-03-30T15:01:24Z" level=error msg="thresholds on metrics 'http_req_duration' have been crossed"

```
</details>

#!/usr/bin/env bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER mdb_service_user WITH PASSWORD '18cfaa9f5';
	CREATE DATABASE movie_data OWNER mdb_service_user;
	CREATE DATABASE movie_review_data OWNER mdb_service_user;
	CREATE DATABASE app_user_data OWNER mdb_service_user;
	CREATE USER query_service_user WITH PASSWORD 'jw8s0F4';
	CREATE DATABASE read_db OWNER query_service_user;
EOSQL

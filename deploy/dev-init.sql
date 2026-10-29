-- Runs once when a development database container is first created.
-- Creates the DML-only role the application connects as. The migration grants it table access.
CREATE ROLE foldback_app LOGIN PASSWORD 'foldback_app';

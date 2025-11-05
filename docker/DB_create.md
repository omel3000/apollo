CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    account_status VARCHAR(50) DEFAULT 'aktywny',
    password_reset_token VARCHAR(255)
);

CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_user_id INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'aktywny',
    CONSTRAINT fk_owner FOREIGN KEY (owner_user_id) REFERENCES users(user_id)
);

CREATE TABLE user_projects (
    user_project_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(project_id),
    CONSTRAINT uc_user_project UNIQUE (user_id, project_id)
);

CREATE TABLE public.work_reports (
    report_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    work_date DATE NOT NULL,
    hours_spent INTEGER NOT NULL DEFAULT 0,
    minutes_spent INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_hours_spent CHECK (hours_spent >= 0 AND hours_spent <= 24),
    CONSTRAINT chk_minutes_spent CHECK (minutes_spent >= 0 AND minutes_spent < 60),
    CONSTRAINT chk_time_not_zero CHECK ((hours_spent + minutes_spent) > 0)
);



---
Dodano:

ALTER TABLE projects
ADD COLUMN created_by_user_id INTEGER NOT NULL;

ALTER TABLE projects
ADD CONSTRAINT fk_created_by_user FOREIGN KEY (created_by_user_id) REFERENCES users(user_id);

ALTER TABLE projects
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

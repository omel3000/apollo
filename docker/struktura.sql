--
-- PostgreSQL database dump
--

\restrict Vp6NPFT3dbsa8wwIWUkx2O3YCJa3gHAof8TyeChakhgxMTwydRihpQ1NdtR7OTl

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: absence_status; Type: TYPE; Schema: public; Owner: apollo
--

CREATE TYPE public.absence_status AS ENUM (
    'roboczy',
    'oczekuje_na_akceptacje',
    'zaakceptowany',
    'odrzucony',
    'zablokowany'
);


ALTER TYPE public.absence_status OWNER TO apollo;

--
-- Name: absencestatus; Type: TYPE; Schema: public; Owner: apollo
--

CREATE TYPE public.absencestatus AS ENUM (
    'draft',
    'pending',
    'approved',
    'rejected',
    'locked'
);


ALTER TYPE public.absencestatus OWNER TO apollo;

--
-- Name: absencetype; Type: TYPE; Schema: public; Owner: apollo
--

CREATE TYPE public.absencetype AS ENUM (
    'urlop',
    'L4',
    'inne'
);


ALTER TYPE public.absencetype OWNER TO apollo;

--
-- Name: period_status; Type: TYPE; Schema: public; Owner: apollo
--

CREATE TYPE public.period_status AS ENUM (
    'otwarty',
    'oczekuje_na_zamkniecie',
    'zamkniety',
    'odblokowany'
);


ALTER TYPE public.period_status OWNER TO apollo;

--
-- Name: periodstatus; Type: TYPE; Schema: public; Owner: apollo
--

CREATE TYPE public.periodstatus AS ENUM (
    'open',
    'pending_close',
    'closed',
    'unlocked'
);


ALTER TYPE public.periodstatus OWNER TO apollo;

--
-- Name: report_status; Type: TYPE; Schema: public; Owner: apollo
--

CREATE TYPE public.report_status AS ENUM (
    'roboczy',
    'oczekuje_na_akceptacje',
    'zaakceptowany',
    'odrzucony',
    'zablokowany'
);


ALTER TYPE public.report_status OWNER TO apollo;

--
-- Name: shifttype; Type: TYPE; Schema: public; Owner: apollo
--

CREATE TYPE public.shifttype AS ENUM (
    'normalna',
    'urlop',
    'L4',
    'inne'
);


ALTER TYPE public.shifttype OWNER TO apollo;

--
-- Name: timetype; Type: TYPE; Schema: public; Owner: apollo
--

CREATE TYPE public.timetype AS ENUM (
    'constant',
    'from_to'
);


ALTER TYPE public.timetype OWNER TO apollo;

--
-- Name: workreportstatus; Type: TYPE; Schema: public; Owner: apollo
--

CREATE TYPE public.workreportstatus AS ENUM (
    'draft',
    'pending',
    'approved',
    'rejected',
    'locked'
);


ALTER TYPE public.workreportstatus OWNER TO apollo;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: absences; Type: TABLE; Schema: public; Owner: apollo
--

CREATE TABLE public.absences (
    absence_id integer NOT NULL,
    user_id integer NOT NULL,
    absence_type character varying(20) NOT NULL,
    date_from date NOT NULL,
    date_to date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status public.absence_status DEFAULT 'roboczy'::public.absence_status NOT NULL,
    submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    rejected_at timestamp with time zone,
    reviewed_by_user_id integer,
    reviewer_comment character varying(2000),
    CONSTRAINT absences_absence_type_check CHECK (((absence_type)::text = ANY ((ARRAY['urlop'::character varying, 'L4'::character varying, 'inne'::character varying])::text[])))
);


ALTER TABLE public.absences OWNER TO apollo;

--
-- Name: absences_absence_id_seq; Type: SEQUENCE; Schema: public; Owner: apollo
--

CREATE SEQUENCE public.absences_absence_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.absences_absence_id_seq OWNER TO apollo;

--
-- Name: absences_absence_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: apollo
--

ALTER SEQUENCE public.absences_absence_id_seq OWNED BY public.absences.absence_id;


--
-- Name: approval_log; Type: TABLE; Schema: public; Owner: apollo
--

CREATE TABLE public.approval_log (
    approval_log_id integer NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    action character varying(30) NOT NULL,
    actor_user_id integer,
    comment character varying(2000),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.approval_log OWNER TO apollo;

--
-- Name: approval_log_approval_log_id_seq; Type: SEQUENCE; Schema: public; Owner: apollo
--

CREATE SEQUENCE public.approval_log_approval_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.approval_log_approval_log_id_seq OWNER TO apollo;

--
-- Name: approval_log_approval_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: apollo
--

ALTER SEQUENCE public.approval_log_approval_log_id_seq OWNED BY public.approval_log.approval_log_id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: apollo
--

CREATE TABLE public.audit_logs (
    log_id integer NOT NULL,
    user_id integer,
    user_email character varying(255),
    user_role character varying(50),
    action character varying(255) NOT NULL,
    method character varying(10) NOT NULL,
    path character varying(500) NOT NULL,
    status_code integer NOT NULL,
    ip_address character varying(100),
    user_agent character varying(255),
    detail character varying(2000),
    duration_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    action_group character varying(255),
    entity_type character varying(50),
    entity_id integer
);


ALTER TABLE public.audit_logs OWNER TO apollo;

--
-- Name: audit_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: apollo
--

CREATE SEQUENCE public.audit_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_log_id_seq OWNER TO apollo;

--
-- Name: audit_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: apollo
--

ALTER SEQUENCE public.audit_logs_log_id_seq OWNED BY public.audit_logs.log_id;


--
-- Name: availability; Type: TABLE; Schema: public; Owner: apollo
--

CREATE TABLE public.availability (
    user_id integer NOT NULL,
    date date NOT NULL,
    is_available boolean NOT NULL,
    time_from time without time zone,
    time_to time without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.availability OWNER TO apollo;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: apollo
--

CREATE TABLE public.messages (
    message_id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true
);


ALTER TABLE public.messages OWNER TO apollo;

--
-- Name: messages_message_id_seq; Type: SEQUENCE; Schema: public; Owner: apollo
--

CREATE SEQUENCE public.messages_message_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_message_id_seq OWNER TO apollo;

--
-- Name: messages_message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: apollo
--

ALTER SEQUENCE public.messages_message_id_seq OWNED BY public.messages.message_id;


--
-- Name: period_closures; Type: TABLE; Schema: public; Owner: apollo
--

CREATE TABLE public.period_closures (
    period_closure_id integer NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    status public.period_status DEFAULT 'otwarty'::public.period_status NOT NULL,
    locked_by_user_id integer,
    locked_at timestamp with time zone,
    unlocked_at timestamp with time zone,
    notes character varying(2000)
);


ALTER TABLE public.period_closures OWNER TO apollo;

--
-- Name: period_closures_period_closure_id_seq; Type: SEQUENCE; Schema: public; Owner: apollo
--

CREATE SEQUENCE public.period_closures_period_closure_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.period_closures_period_closure_id_seq OWNER TO apollo;

--
-- Name: period_closures_period_closure_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: apollo
--

ALTER SEQUENCE public.period_closures_period_closure_id_seq OWNED BY public.period_closures.period_closure_id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: apollo
--

CREATE TABLE public.projects (
    project_id integer NOT NULL,
    project_name character varying(255) NOT NULL,
    description text,
    owner_user_id integer NOT NULL,
    status character varying(50) DEFAULT 'aktywny'::character varying,
    created_by_user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    time_type public.timetype DEFAULT 'constant'::public.timetype NOT NULL
);


ALTER TABLE public.projects OWNER TO apollo;

--
-- Name: projects_project_id_seq; Type: SEQUENCE; Schema: public; Owner: apollo
--

CREATE SEQUENCE public.projects_project_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_project_id_seq OWNER TO apollo;

--
-- Name: projects_project_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: apollo
--

ALTER SEQUENCE public.projects_project_id_seq OWNED BY public.projects.project_id;


--
-- Name: schedule; Type: TABLE; Schema: public; Owner: apollo
--

CREATE TABLE public.schedule (
    schedule_id integer NOT NULL,
    user_id integer NOT NULL,
    project_id integer,
    work_date date NOT NULL,
    time_from time without time zone NOT NULL,
    time_to time without time zone NOT NULL,
    shift_type character varying(20) NOT NULL,
    created_by_user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT schedule_shift_type_check CHECK (((shift_type)::text = ANY ((ARRAY['normalna'::character varying, 'urlop'::character varying, 'L4'::character varying, 'inne'::character varying])::text[])))
);


ALTER TABLE public.schedule OWNER TO apollo;

--
-- Name: schedule_schedule_id_seq; Type: SEQUENCE; Schema: public; Owner: apollo
--

CREATE SEQUENCE public.schedule_schedule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.schedule_schedule_id_seq OWNER TO apollo;

--
-- Name: schedule_schedule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: apollo
--

ALTER SEQUENCE public.schedule_schedule_id_seq OWNED BY public.schedule.schedule_id;


--
-- Name: user_projects; Type: TABLE; Schema: public; Owner: apollo
--

CREATE TABLE public.user_projects (
    user_project_id integer NOT NULL,
    user_id integer NOT NULL,
    project_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_projects OWNER TO apollo;

--
-- Name: user_projects_user_project_id_seq; Type: SEQUENCE; Schema: public; Owner: apollo
--

CREATE SEQUENCE public.user_projects_user_project_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_projects_user_project_id_seq OWNER TO apollo;

--
-- Name: user_projects_user_project_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: apollo
--

ALTER SEQUENCE public.user_projects_user_project_id_seq OWNED BY public.user_projects.user_project_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: apollo
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    phone_number character varying(20),
    password_hash character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    registration_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    account_status character varying(50) DEFAULT 'aktywny'::character varying,
    password_reset_token character varying(255),
    birth_date date,
    address character varying(500)
);


ALTER TABLE public.users OWNER TO apollo;

--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: apollo
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_user_id_seq OWNER TO apollo;

--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: apollo
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: work_reports; Type: TABLE; Schema: public; Owner: apollo
--

CREATE TABLE public.work_reports (
    report_id integer NOT NULL,
    user_id integer NOT NULL,
    project_id integer NOT NULL,
    work_date date NOT NULL,
    hours_spent numeric(5,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    minutes_spent integer DEFAULT 0 NOT NULL,
    description text,
    time_from time without time zone,
    time_to time without time zone,
    status public.report_status DEFAULT 'roboczy'::public.report_status NOT NULL,
    submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    rejected_at timestamp with time zone,
    reviewed_by_user_id integer,
    reviewer_comment character varying(2000)
);


ALTER TABLE public.work_reports OWNER TO apollo;

--
-- Name: work_reports_report_id_seq; Type: SEQUENCE; Schema: public; Owner: apollo
--

CREATE SEQUENCE public.work_reports_report_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.work_reports_report_id_seq OWNER TO apollo;

--
-- Name: work_reports_report_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: apollo
--

ALTER SEQUENCE public.work_reports_report_id_seq OWNED BY public.work_reports.report_id;


--
-- Name: absences absence_id; Type: DEFAULT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.absences ALTER COLUMN absence_id SET DEFAULT nextval('public.absences_absence_id_seq'::regclass);


--
-- Name: approval_log approval_log_id; Type: DEFAULT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.approval_log ALTER COLUMN approval_log_id SET DEFAULT nextval('public.approval_log_approval_log_id_seq'::regclass);


--
-- Name: audit_logs log_id; Type: DEFAULT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN log_id SET DEFAULT nextval('public.audit_logs_log_id_seq'::regclass);


--
-- Name: messages message_id; Type: DEFAULT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.messages ALTER COLUMN message_id SET DEFAULT nextval('public.messages_message_id_seq'::regclass);


--
-- Name: period_closures period_closure_id; Type: DEFAULT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.period_closures ALTER COLUMN period_closure_id SET DEFAULT nextval('public.period_closures_period_closure_id_seq'::regclass);


--
-- Name: projects project_id; Type: DEFAULT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.projects ALTER COLUMN project_id SET DEFAULT nextval('public.projects_project_id_seq'::regclass);


--
-- Name: schedule schedule_id; Type: DEFAULT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.schedule ALTER COLUMN schedule_id SET DEFAULT nextval('public.schedule_schedule_id_seq'::regclass);


--
-- Name: user_projects user_project_id; Type: DEFAULT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.user_projects ALTER COLUMN user_project_id SET DEFAULT nextval('public.user_projects_user_project_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: work_reports report_id; Type: DEFAULT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.work_reports ALTER COLUMN report_id SET DEFAULT nextval('public.work_reports_report_id_seq'::regclass);


--
-- Name: absences absences_pkey; Type: CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.absences
    ADD CONSTRAINT absences_pkey PRIMARY KEY (absence_id);


--
-- Name: approval_log approval_log_pkey; Type: CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.approval_log
    ADD CONSTRAINT approval_log_pkey PRIMARY KEY (approval_log_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (log_id);


--
-- Name: availability availability_pkey; Type: CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.availability
    ADD CONSTRAINT availability_pkey PRIMARY KEY (user_id, date);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (message_id);


--
-- Name: period_closures period_closures_pkey; Type: CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.period_closures
    ADD CONSTRAINT period_closures_pkey PRIMARY KEY (period_closure_id);


--
-- Name: period_closures period_closures_year_month_key; Type: CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.period_closures
    ADD CONSTRAINT period_closures_year_month_key UNIQUE (year, month);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (project_id);


--
-- Name: schedule schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.schedule
    ADD CONSTRAINT schedule_pkey PRIMARY KEY (schedule_id);


--
-- Name: user_projects uc_user_project; Type: CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.user_projects
    ADD CONSTRAINT uc_user_project UNIQUE (user_id, project_id);


--
-- Name: user_projects user_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.user_projects
    ADD CONSTRAINT user_projects_pkey PRIMARY KEY (user_project_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: work_reports work_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.work_reports
    ADD CONSTRAINT work_reports_pkey PRIMARY KEY (report_id);


--
-- Name: idx_absences_date_status; Type: INDEX; Schema: public; Owner: apollo
--

CREATE INDEX idx_absences_date_status ON public.absences USING btree (date_from, status);


--
-- Name: idx_absences_status; Type: INDEX; Schema: public; Owner: apollo
--

CREATE INDEX idx_absences_status ON public.absences USING btree (status);


--
-- Name: idx_approval_log_entity; Type: INDEX; Schema: public; Owner: apollo
--

CREATE INDEX idx_approval_log_entity ON public.approval_log USING btree (entity_type, entity_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: apollo
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_action_group; Type: INDEX; Schema: public; Owner: apollo
--

CREATE INDEX idx_audit_logs_action_group ON public.audit_logs USING btree (action_group);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: apollo
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: apollo
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: apollo
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_work_reports_status; Type: INDEX; Schema: public; Owner: apollo
--

CREATE INDEX idx_work_reports_status ON public.work_reports USING btree (status);


--
-- Name: idx_work_reports_work_date_status; Type: INDEX; Schema: public; Owner: apollo
--

CREATE INDEX idx_work_reports_work_date_status ON public.work_reports USING btree (work_date, status);


--
-- Name: absences absences_reviewed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.absences
    ADD CONSTRAINT absences_reviewed_by_user_id_fkey FOREIGN KEY (reviewed_by_user_id) REFERENCES public.users(user_id);


--
-- Name: absences absences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.absences
    ADD CONSTRAINT absences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: approval_log approval_log_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.approval_log
    ADD CONSTRAINT approval_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(user_id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: availability availability_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.availability
    ADD CONSTRAINT availability_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: projects fk_created_by_user; Type: FK CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT fk_created_by_user FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id);


--
-- Name: projects fk_owner; Type: FK CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT fk_owner FOREIGN KEY (owner_user_id) REFERENCES public.users(user_id);


--
-- Name: user_projects fk_project; Type: FK CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.user_projects
    ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES public.projects(project_id);


--
-- Name: work_reports fk_report_project; Type: FK CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.work_reports
    ADD CONSTRAINT fk_report_project FOREIGN KEY (project_id) REFERENCES public.projects(project_id);


--
-- Name: work_reports fk_report_user; Type: FK CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.work_reports
    ADD CONSTRAINT fk_report_user FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: user_projects fk_user; Type: FK CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.user_projects
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: period_closures period_closures_locked_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.period_closures
    ADD CONSTRAINT period_closures_locked_by_user_id_fkey FOREIGN KEY (locked_by_user_id) REFERENCES public.users(user_id);


--
-- Name: schedule schedule_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.schedule
    ADD CONSTRAINT schedule_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: schedule schedule_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.schedule
    ADD CONSTRAINT schedule_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE SET NULL;


--
-- Name: schedule schedule_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.schedule
    ADD CONSTRAINT schedule_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: work_reports work_reports_reviewed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.work_reports
    ADD CONSTRAINT work_reports_reviewed_by_user_id_fkey FOREIGN KEY (reviewed_by_user_id) REFERENCES public.users(user_id);


--
-- PostgreSQL database dump complete
--

\unrestrict Vp6NPFT3dbsa8wwIWUkx2O3YCJa3gHAof8TyeChakhgxMTwydRihpQ1NdtR7OTl


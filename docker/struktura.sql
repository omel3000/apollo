--
-- PostgreSQL database dump
--

\restrict 9iMBHOtSV7gjvKl7Qg9dvvhQoVSJ8lYFco5RDziZ0v5gxZdEsbJjRuCOKx0KKhE

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
-- Name: absencetype; Type: TYPE; Schema: public; Owner: apollo
--

CREATE TYPE public.absencetype AS ENUM (
    'urlop',
    'L4',
    'inne'
);


ALTER TYPE public.absencetype OWNER TO apollo;

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
    time_to time without time zone
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
-- Name: messages message_id; Type: DEFAULT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.messages ALTER COLUMN message_id SET DEFAULT nextval('public.messages_message_id_seq'::regclass);


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
-- Name: absences absences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apollo
--

ALTER TABLE ONLY public.absences
    ADD CONSTRAINT absences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


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
-- PostgreSQL database dump complete
--

\unrestrict 9iMBHOtSV7gjvKl7Qg9dvvhQoVSJ8lYFco5RDziZ0v5gxZdEsbJjRuCOKx0KKhE


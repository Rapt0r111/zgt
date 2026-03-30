--
-- PostgreSQL database dump
--

\restrict sghPJwoQYp13v7VT8NRuCN2L8Ff1a4LgCJ83UYCsLCkC6ed7DRmZMwSda4ISz4P

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: personnelstatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.personnelstatus AS ENUM (
    'IN_SERVICE',
    'ON_MISSION',
    'IN_HOSPITAL',
    'ON_LEAVE'
);


ALTER TYPE public.personnelstatus OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipment (
    id integer NOT NULL,
    equipment_type character varying(50) NOT NULL,
    inventory_number character varying(100),
    serial_number character varying(100),
    mni_serial_number character varying(100),
    manufacturer character varying(100),
    model character varying(255),
    cpu character varying(255),
    ram_gb integer,
    storage_type character varying(50),
    storage_capacity_gb integer,
    has_optical_drive boolean,
    has_card_reader boolean,
    has_laptop boolean,
    laptop_functional boolean,
    has_charger boolean,
    charger_functional boolean,
    has_mouse boolean,
    mouse_functional boolean,
    has_bag boolean,
    bag_functional boolean,
    operating_system character varying(100),
    current_owner_id integer,
    current_location character varying(255),
    status character varying(50),
    notes text,
    is_active boolean,
    created_at timestamp with time zone DEFAULT timezone('UTC'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('UTC'::text, now()) NOT NULL,
    is_personal boolean DEFAULT false NOT NULL
);


ALTER TABLE public.equipment OWNER TO postgres;

--
-- Name: equipment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.equipment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.equipment_id_seq OWNER TO postgres;

--
-- Name: equipment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.equipment_id_seq OWNED BY public.equipment.id;


--
-- Name: equipment_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipment_movements (
    id integer NOT NULL,
    equipment_id integer NOT NULL,
    from_location character varying(255),
    to_location character varying(255),
    from_person_id integer,
    to_person_id integer,
    movement_type character varying(50),
    document_number character varying(100),
    document_date timestamp with time zone,
    reason text,
    created_at timestamp with time zone DEFAULT timezone('UTC'::text, now()) NOT NULL,
    created_by_id integer
);


ALTER TABLE public.equipment_movements OWNER TO postgres;

--
-- Name: equipment_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.equipment_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.equipment_movements_id_seq OWNER TO postgres;

--
-- Name: equipment_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.equipment_movements_id_seq OWNED BY public.equipment_movements.id;


--
-- Name: personnel; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.personnel (
    id integer NOT NULL,
    full_name character varying NOT NULL,
    rank character varying,
    rank_priority integer,
    "position" character varying,
    platoon character varying,
    personal_number character varying,
    service_number character varying,
    security_clearance_level integer,
    clearance_order_number character varying,
    clearance_expiry_date timestamp without time zone,
    status public.personnelstatus NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.personnel OWNER TO postgres;

--
-- Name: personnel_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.personnel_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.personnel_id_seq OWNER TO postgres;

--
-- Name: personnel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.personnel_id_seq OWNED BY public.personnel.id;


--
-- Name: phones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.phones (
    id integer NOT NULL,
    owner_id integer NOT NULL,
    model character varying(255),
    color character varying(50),
    imei_1 character varying(15),
    imei_2 character varying(15),
    serial_number character varying(100),
    has_camera boolean,
    has_recorder boolean,
    storage_location character varying(100),
    status character varying(50),
    is_active boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.phones OWNER TO postgres;

--
-- Name: phones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.phones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.phones_id_seq OWNER TO postgres;

--
-- Name: phones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.phones_id_seq OWNED BY public.phones.id;


--
-- Name: storage_and_passes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.storage_and_passes (
    id integer NOT NULL,
    asset_type character varying(50) NOT NULL,
    serial_number character varying(100) NOT NULL,
    model character varying(255),
    manufacturer character varying(100),
    status character varying(50) NOT NULL,
    assigned_to_id integer,
    capacity_gb integer,
    access_level integer,
    issue_date timestamp with time zone,
    return_date timestamp with time zone,
    notes text,
    is_active boolean,
    created_at timestamp with time zone DEFAULT timezone('UTC'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('UTC'::text, now()) NOT NULL,
    CONSTRAINT ck_asset_type CHECK (((asset_type)::text = ANY (ARRAY[('flash_drive'::character varying)::text, ('electronic_pass'::character varying)::text]))),
    CONSTRAINT ck_status CHECK (((status)::text = ANY (ARRAY[('in_use'::character varying)::text, ('stock'::character varying)::text, ('broken'::character varying)::text, ('lost'::character varying)::text])))
);


ALTER TABLE public.storage_and_passes OWNER TO postgres;

--
-- Name: storage_and_passes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.storage_and_passes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.storage_and_passes_id_seq OWNER TO postgres;

--
-- Name: storage_and_passes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.storage_and_passes_id_seq OWNED BY public.storage_and_passes.id;


--
-- Name: storage_devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.storage_devices (
    id integer NOT NULL,
    equipment_id integer,
    device_type character varying(50) NOT NULL,
    inventory_number character varying(100),
    serial_number character varying(100),
    manufacturer character varying(100),
    model character varying(255),
    capacity_gb integer,
    interface character varying(50),
    status character varying(50),
    location character varying(255),
    notes text,
    is_active boolean,
    created_at timestamp with time zone DEFAULT timezone('UTC'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('UTC'::text, now()) NOT NULL
);


ALTER TABLE public.storage_devices OWNER TO postgres;

--
-- Name: storage_devices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.storage_devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.storage_devices_id_seq OWNER TO postgres;

--
-- Name: storage_devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.storage_devices_id_seq OWNED BY public.storage_devices.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    is_active boolean NOT NULL,
    last_login timestamp with time zone,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: equipment id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment ALTER COLUMN id SET DEFAULT nextval('public.equipment_id_seq'::regclass);


--
-- Name: equipment_movements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_movements ALTER COLUMN id SET DEFAULT nextval('public.equipment_movements_id_seq'::regclass);


--
-- Name: personnel id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personnel ALTER COLUMN id SET DEFAULT nextval('public.personnel_id_seq'::regclass);


--
-- Name: phones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phones ALTER COLUMN id SET DEFAULT nextval('public.phones_id_seq'::regclass);


--
-- Name: storage_and_passes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_and_passes ALTER COLUMN id SET DEFAULT nextval('public.storage_and_passes_id_seq'::regclass);


--
-- Name: storage_devices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_devices ALTER COLUMN id SET DEFAULT nextval('public.storage_devices_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
eb8934c1075d
\.


--
-- Data for Name: equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.equipment (id, equipment_type, inventory_number, serial_number, mni_serial_number, manufacturer, model, cpu, ram_gb, storage_type, storage_capacity_gb, has_optical_drive, has_card_reader, has_laptop, laptop_functional, has_charger, charger_functional, has_mouse, mouse_functional, has_bag, bag_functional, operating_system, current_owner_id, current_location, status, notes, is_active, created_at, updated_at, is_personal) FROM stdin;
3	Ноутбук	616/46	222081909046R-0508	2L49292DQJRA	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 7, МЫШКА 1)	\N	8	\N	512	f	f	t	t	f	t	f	t	f	t	\N	1	Выдан	В работе	Рабочее (Идеальное)	t	2026-02-16 15:08:25.170286+03	2026-03-14 18:50:11.1509+03	f
42	ПЭВМ	530/320/040	2191226127801-0195	2J4320089250	Aquarius	(Уточнить)	\N	8	\N	512	f	f	f	f	f	f	f	f	f	f	\N	71	\N	В работе	\N	t	2026-02-17 16:30:00.696111+03	2026-03-14 07:51:31.115722+03	f
43	ПЭВМ	530/320/041	\N	2J4320047324	Aquarius	(Уточнить)	\N	16	\N	512	f	f	f	f	f	f	f	f	f	f	\N	73	\N	В работе	\N	t	2026-02-17 16:33:12.063471+03	2026-02-18 09:26:28.006021+03	f
44	ПЭВМ	530/320/042	2191224127816-0006	2J4320047035	Aquarius	(Уточнить)	\N	16	\N	512	f	f	f	f	f	f	f	f	f	f	\N	69	\N	В работе	\N	t	2026-02-17 16:33:52.399311+03	2026-03-14 07:52:05.021672+03	f
45	ПЭВМ	530/320/043	2191226127801-0076	2J4320048103	Aquarius	(Уточнить)	\N	16	\N	512	f	f	f	f	f	f	f	f	f	f	\N	70	\N	На складе	\N	t	2026-02-17 16:34:39.85701+03	2026-03-14 09:20:23.008238+03	f
46	ПЭВМ	530/320/044	\N	2J4020002715	Aquarius	(Уточнить)	\N	16	\N	512	f	f	f	f	f	f	f	f	f	f	\N	\N	\N	На складе	\N	t	2026-02-17 16:35:42.26721+03	2026-02-18 09:26:44.762762+03	f
47	ПЭВМ	530/320/045	2J4320090052	2191225127819-0113	Aquarius	(Уточнить)	\N	16	\N	512	f	f	f	f	f	f	f	f	f	f	\N	\N	Дежурный по ТП	На складе	\N	t	2026-02-17 16:36:23.33545+03	2026-03-14 09:19:03.130662+03	f
52	ПЭВМ	530/321/737	224061034110B-0067	2N36292876D2	Aquarius	\N	\N	16	\N	512	f	f	f	f	f	f	f	f	f	f	\N	\N	ваез ТП	В работе	\N	t	2026-03-14 09:22:11.230468+03	2026-03-14 09:22:11.230468+03	f
2	Ноутбук	616/45	222081909046R-0826	2L512L24N8XL	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 3)	\N	8	\N	512	f	f	t	t	t	t	t	t	f	t	\N	40	Выдан	В работе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-14 18:04:39.681998+03	f
4	Ноутбук	616/47	222081909046R-0379	2L492924SCGP	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 1, МЫШКА 2)	\N	8	\N	512	f	f	t	t	t	t	t	t	f	t	\N	3	Выдан	В работе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-14 19:11:37.605179+03	f
5	Ноутбук	616/48	222081909046R-1780	2L512L2S4JVL	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 8, МЫШКА 3)	\N	8	\N	512	f	f	t	t	t	t	t	t	t	t	\N	4	Выдан	В работе	Рабочее (Идеальное)	t	2026-02-16 15:08:25.170286+03	2026-03-14 19:34:02.661+03	f
7	Ноутбук	616/50	222081909046R-0312	2M012LQCQ2E1	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 12, МЫШКА 4)	\N	8	\N	512	f	f	t	t	t	t	t	t	f	t	\N	8	Выдан	В работе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-14 19:53:20.544328+03	f
8	Ноутбук	616/51	222081909046R-0034	2L5129QCANX9	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 2, МЫШКА 5)	\N	8	\N	512	f	f	t	t	t	t	t	t	f	t	\N	19	Выдан	В работе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-14 20:05:22.226161+03	f
9	Ноутбук	616/52	222081909046R-0872	2L512924692H	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 14, МЫШКА 6)	\N	8	\N	512	f	f	t	t	f	t	f	t	f	t	\N	11	Выдан	В работе	Рабочее (Идеальное)	t	2026-02-16 15:08:25.170286+03	2026-03-14 20:19:29.812516+03	f
10	Ноутбук	616/53	222081909046R-0800	2L512L2485N2	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 25)	\N	8	\N	512	f	f	t	t	t	t	t	t	f	t	\N	13	Выдан	В работе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-15 05:19:35.270284+03	f
26	Ноутбук	616/69	222081909046R-0028	2L512LQSQ1HA	Aquarius	CMP NS68SU R11	\N	8	\N	512	f	f	t	t	t	t	t	t	t	t	\N	70	Склад	На складе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:31:20.218182+03	f
27	Ноутбук	616/70	222081909046R-0005	2L512L2C152P	Aquarius	CMP NS68SU R11	\N	8	\N	512	f	f	t	t	t	t	t	t	f	t	\N	70	Склад	На складе	Рабочее (Идеальное) | Ноутбук + Зарядка (без мыши)	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:32:51.75642+03	f
6	Ноутбук	616/49	222081909046R-0322	2M012LQC1KR7	Aquarius	CMP NS68SU R11	\N	8	\N	512	f	f	t	t	t	t	t	t	t	t	\N	70	Выдан	На складе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-19 07:35:12.421158+03	f
11	Ноутбук	616/54	222081909046R-1304	2L5129QCQHUP	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 5, МЫШКА 7)	\N	8	\N	512	f	f	t	t	t	t	t	t	f	t	\N	33	Выдан	В работе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-14 20:33:28.042377+03	f
12	Ноутбук	616/55	222081909046R-0253	2M012LQSK9UT	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 20, МЫШКА 9)	\N	8	\N	512	f	f	t	t	t	t	t	t	t	t	\N	16	Выдан	В работе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-14 20:44:35.602523+03	f
14	Ноутбук	616/57	222081909046R-0335	2M012LQS9E2T	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 26 МЫШКА 8)	\N	8	\N	512	f	f	t	t	t	t	t	t	t	t	\N	18	Выдан	В работе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-14 20:57:06.530041+03	f
15	Ноутбук	616/58	222081909046R-0065	2L51292SCNHC	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 6, МЫШКА 11)	\N	8	\N	512	f	f	t	t	t	t	t	t	t	t	\N	12	Выдан	В работе	Рабочее (Идеальное)	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:05:39.600329+03	f
16	Ноутбук	616/59	222081909046R-0080	2L512L2SAGCX	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 4, МЫШКА 12)	\N	8	\N	512	f	f	t	t	t	t	t	t	t	t	\N	20	Выдан	В работе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:13:31.82885+03	f
18	Ноутбук	616/61	222081909046R-1332	2L51292E84PU	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 15, МЫШКА 13)	\N	8	\N	512	f	f	t	t	t	t	t	t	t	t	\N	35	Выдан	В работе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:20:01.557506+03	f
19	Ноутбук	616/62	222081909046R-0002	2L512LQ4B1J6	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 28, МЫШКА 14)	\N	8	\N	512	f	f	t	t	t	t	t	t	t	t	\N	36	Выдан	В работе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:25:10.318234+03	f
24	Ноутбук	616/67	222081909046R-0351	2M012LQCQC2G	Aquarius	CMP NS68SU R11	\N	8	\N	512	f	f	t	t	t	t	t	t	f	t	\N	70	Склад	На складе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:30:32.928789+03	f
30	Ноутбук	616/73	222081909046R-0183	2L512L24A6TU	Aquarius	CMP NS68SU R11	\N	8	\N	512	f	f	t	t	f	t	f	t	f	t	АСТРА	70	Склад	На складе	АСТРА	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:34:37.248275+03	f
20	Ноутбук	616/63	222081909046R-1087	2L512LQE82GA	Aquarius	CMP NS68SU R11	\N	8	\N	512	f	f	t	t	t	t	t	t	t	t	\N	70	Выдан	На складе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:28:54.105921+03	f
21	Ноутбук	616/64	222081909046R-0210	2M012LQS2CXY	Aquarius	CMP NS68SU R11	\N	8	\N	512	f	f	t	t	t	t	t	t	t	t	\N	70	Склад	На складе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-19 06:13:00.128523+03	f
23	Ноутбук	616/66	222081909046R-0539	2L492L2DJ4XD	Aquarius	CMP NS68SU R11	\N	8	\N	512	f	f	t	t	t	t	t	t	t	t	\N	70	Склад	На складе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:30:08.5213+03	f
34	Ноутбук	616/77	222081909046R-1094	2L5129246QDP	Aquarius	CMP NS68SU R11	\N	8	\N	512	f	f	t	f	f	t	f	t	f	t	\N	70	Склад	На складе	Синий экран, диск в режиме чтения	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:36:01.953685+03	f
22	Ноутбук	616/65	222081909046R-0062	2L512L2SC1JF	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 17)	\N	8	\N	512	f	f	t	f	t	t	t	t	f	t	\N	37	Склад	В работе	синий экран, диск в режиме чтения	t	2026-02-16 15:08:25.170286+03	2026-03-19 07:34:49.436716+03	f
17	Ноутбук	616/60	222081909046R-1306	2L512LQE7JTE	Aquarius	CMP NS68SU R11	\N	8	\N	512	f	f	t	t	t	t	t	t	t	t	\N	70	Выдан	На складе	Рабочее (Идеальное) | Полный комплект (Ноутбук + Зарядка + Мышь)	t	2026-02-16 15:08:25.170286+03	2026-03-19 07:35:25.974266+03	f
13	Ноутбук	616/56	222081909046R-0039	2L51292C1DGX	Aquarius	CMP NS68SU R11	\N	8	\N	512	f	f	t	t	f	t	t	t	f	t	\N	70	Выдан	На складе	Рабочее (Идеальное) | Ноутбук + Мышь (без зарядки)	t	2026-02-16 15:08:25.170286+03	2026-03-19 12:13:18.471687+03	f
25	Ноутбук	616/68	222081909046R-0357	2M012L2SA7XL	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 24, МЫШКА 10)	\N	8	\N	512	f	f	t	t	t	t	t	t	t	t	\N	17	Выдан	В работе	Рабочее (Есть потертости) | Полный комплект (Ноутбук + Зарядка + Мышь) | У Казанцева (акт выдачи за ситниковым)	t	2026-02-16 15:08:25.170286+03	2026-03-15 05:29:46.38783+03	f
28	Ноутбук	616/71	222081909046R-0339	2M012L2CANA7	Aquarius	CMP NS68SU R11	\N	8	\N	512	f	f	t	t	t	t	t	t	f	t	\N	70	Склад	На складе	Рабочее (Идеальное) | Ноутбук + Зарядка (без мыши)	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:33:34.225818+03	f
29	Ноутбук	616/72	222081909046R-0184	2L51292EKNAX	Aquarius	CMP NS68SU R11	\N	16	\N	512	f	f	t	f	f	t	f	t	f	t	\N	70	Склад	На складе	Диск в режиме чтения, синий экран	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:34:14.606944+03	f
31	Ноутбук	616/74	222081909046R-1078	2L5129Q4KKGG	Aquarius	CMP NS68SU R11	\N	8	\N	512	f	f	t	f	f	t	f	t	f	t	АСТРА	70	Склад	На складе	Рабочее (Глючит ПО/Windows) | Только ноутбук | Астра	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:34:57.476419+03	f
32	Ноутбук	616/75	222081909046R-0532	2L492L2DQDT1	Aquarius	CMP NS68SU R11	\N	16	\N	512	f	f	t	f	f	t	f	t	f	t	\N	70	Склад	Сломан	МЁРТВЫЙ	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:35:17.464266+03	f
33	Ноутбук	616/76	222081909046R-0217	2L512LQE8K1J	Aquarius	CMP NS68SU R11	\N	16	\N	512	f	f	t	f	f	t	f	t	f	t	\N	70	Склад	На складе	Синий экран. ССд в режиме чтения	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:35:35.197746+03	f
35	Ноутбук	616/78	222081909046R-0135	2L51292E6STT	Aquarius	CMP NS68SU R11	\N	16	\N	512	f	f	t	f	f	t	f	t	f	t	\N	70	Склад	На складе	Не заряжается	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:36:35.955229+03	f
36	Ноутбук	616/79	222081909046R-0044	2L5129QEHILL	Aquarius	CMP NS68SU R11	\N	8	\N	512	f	f	t	f	f	t	f	t	f	t	АСТРА	70	Склад	На складе	Рабочее (Глючит ПО/Windows) | Только ноутбук | Астра	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:36:53.636577+03	f
37	Ноутбук	616/80	222081909046R-0562	2L492LQ576FF	Aquarius	CMP NS68SU R11	\N	16	\N	512	f	f	t	f	f	t	f	t	f	t	Windows 10 Pro	70	Склад	На складе	Синий экран. Винда не грузит	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:37:18.209923+03	f
39	Ноутбук	616/82	222081909046R-0706	2L512LQE7SCR	Aquarius	CMP NS68SU R11	\N	8	\N	512	f	f	t	f	f	t	f	t	f	t	\N	70	Склад	На складе	Не включается (Сломан) | Только ноутбук | Сильно повреждены петли	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:37:57.692872+03	f
40	Ноутбук	616/83	222081909046R-0144	2L512L24J7RA	Aquarius	CMP NS68SU R11	\N	8	\N	512	f	f	t	f	f	t	f	t	f	t	\N	70	Склад	На складе	Не включается (Сломан) | Только ноутбук | повреждена петля	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:38:24.691691+03	f
41	Ноутбук	616/84	222081909046R-0278	2M012L2S1EXU	Aquarius	CMP NS68SU R11	\N	8	\N	512	f	f	t	t	f	t	f	t	f	t	АСТРА	70	Склад	На складе	Астра	t	2026-02-16 15:08:25.170286+03	2026-03-14 21:38:45.076554+03	f
38	Ноутбук	616/81	222081909046R-0868	2L49292DN7EY	Aquarius	CMP NS68SU R11 (ЗАРЯДКА 23)	\N	16	\N	512	f	f	t	f	f	t	f	t	f	t	АСТРА	27	Склад	В работе	Не включается (Сломан) | Только ноутбук | не грузит ОС	t	2026-02-16 15:08:25.170286+03	2026-03-19 07:33:43.503902+03	f
\.


--
-- Data for Name: equipment_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.equipment_movements (id, equipment_id, from_location, to_location, from_person_id, to_person_id, movement_type, document_number, document_date, reason, created_at, created_by_id) FROM stdin;
\.


--
-- Data for Name: personnel; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.personnel (id, full_name, rank, rank_priority, "position", platoon, personal_number, service_number, security_clearance_level, clearance_order_number, clearance_expiry_date, status, is_active, created_at, updated_at) FROM stdin;
1	Орлов Виктор Юрьевич 	Младший сержант	18	Старший оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 11:54:49.468929+03	2026-02-16 11:54:49.468929+03
2	Андреев Илья Андреевич	Ефрейтор	19	Старший оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 11:55:10.428612+03	2026-02-16 11:55:10.428612+03
3	Сидоров Андрей Сергеевич	Младший сержант	18	Старший оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 11:55:33.808456+03	2026-02-16 11:55:33.808456+03
5	Чирич Максим Евгеньевич	Младший сержант	18	Старший оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 11:56:06.003901+03	2026-02-16 11:56:06.003901+03
6	Артемов Егор Александрович	Ефрейтор	19	Старший оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 11:56:22.789421+03	2026-02-16 11:56:22.789421+03
7	Ваез Мохамед Владимир Юссефович 	Ефрейтор	19	Старший оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 11:56:43.722903+03	2026-02-16 11:56:43.722903+03
8	Веремеев Павел Евгеньевич	Ефрейтор	19	Старший оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 11:57:06.978984+03	2026-02-16 11:57:06.978984+03
9	Дубровин Илья Сергеевич	Ефрейтор	19	Старший оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 11:57:26.809601+03	2026-02-16 11:57:26.809601+03
10	Леус Андрей Александрович	Ефрейтор	19	Старший оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 11:57:46.204229+03	2026-02-16 11:57:46.204229+03
11	Распопов Кирилл Романович	Ефрейтор	19	Старший оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 11:58:04.310036+03	2026-02-16 11:58:04.310036+03
12	Переслегин Дмитрий Петрович	Ефрейтор	19	Старший оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 11:58:21.253003+03	2026-02-16 11:58:21.253003+03
13	Сацута Анатолий Игоревич	Ефрейтор	19	Старший оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 11:58:40.496761+03	2026-02-16 11:58:40.496761+03
14	Бабаев Алексей Сергеевич	Рядовой	20	Старший оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 11:59:03.043786+03	2026-02-16 11:59:03.043786+03
15	Бабенко Вячеслав Юрьевич	Ефрейтор	19	Оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 11:59:26.034493+03	2026-02-16 11:59:26.034493+03
16	Баймаков Данил Алексеевич	Рядовой	20	Оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 11:59:55.16643+03	2026-02-16 11:59:55.16643+03
17	Казанцев Матвей Максимович	Рядовой	20	Оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:00:13.795804+03	2026-02-16 12:00:13.795804+03
18	Кистаев Семен Евгеньевич	Рядовой	20	Оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:00:26.733308+03	2026-02-16 12:00:26.733308+03
19	Мачнев Илья Алексеевич	Ефрейтор	19	Оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:00:42.656055+03	2026-02-16 12:00:42.656055+03
20	Поршаков Леонид Николаевич	Рядовой	20	Оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:02:07.168157+03	2026-02-16 12:02:07.168157+03
21	Ронжин Валерий Павлович	Рядовой	20	Оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:02:20.127395+03	2026-02-16 12:02:20.127395+03
22	Селиверстов Кирилл Витальевич	Рядовой	20	Оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:02:30.818031+03	2026-02-16 12:02:30.818031+03
23	Ситников Иван Алексеевич	Рядовой	20	Оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:02:51.415685+03	2026-02-16 12:02:51.415685+03
24	Ткачев Артем Валентинович	Рядовой	20	Оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:03:04.411951+03	2026-02-16 12:03:04.411951+03
25	Цветков Дмитрий Евгеньевич	Ефрейтор	19	Оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:03:20.961285+03	2026-02-16 12:03:20.961285+03
26	Яссер Марк Владимирович	Рядовой	20	Оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:03:33.327093+03	2026-02-16 12:03:33.327093+03
27	Галданов Гэсэр Жамбалович	Рядовой	20	Оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:03:50.355735+03	2026-02-16 12:03:50.355735+03
28	Каравацкий Дмитрий Андреевич	Рядовой	20	Оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:04:00.96168+03	2026-02-16 12:04:00.96168+03
29	Киселев Андрей Юрьевич	Рядовой	20	Оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:04:11.833947+03	2026-02-16 12:04:11.833947+03
30	Лаукарт Михаил Сергеевич	Рядовой	20	Оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:04:27.008468+03	2026-02-16 12:04:27.008468+03
31	Литвинчёв Артем Андреевич	Рядовой	20	Оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:04:38.978006+03	2026-02-16 12:04:38.978006+03
32	Мухутдинов Булат Рамилевич	Ефрейтор	19	Оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:04:56.84948+03	2026-02-16 12:04:56.84948+03
33	Сенченко Даниил Михайлович	Ефрейтор	19	Оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:05:16.612539+03	2026-02-16 12:05:16.612539+03
34	Седунов Никита Александрович	Рядовой	20	Оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:05:30.946708+03	2026-02-16 12:05:30.946708+03
35	Сычев Данила Алексеевич	Рядовой	20	Оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:05:44.687846+03	2026-02-16 12:05:44.687846+03
36	Талько Дмитрий Александрович	Рядовой	20	Оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:05:55.251858+03	2026-02-16 12:05:55.251858+03
37	Темиров Бадюрсолтан Темирович	Рядовой	20	Оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:06:09.093497+03	2026-02-16 12:06:09.093497+03
38	Шингарев Александр Федорович	Рядовой	20	Оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:06:22.144767+03	2026-02-16 12:06:22.144767+03
39	Яковлев Юрий Александрович	Ефрейтор	19	Оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:06:41.667907+03	2026-02-16 12:06:41.667907+03
40	Дудин Антон Александрович	Рядовой	20	Оператор роты (научной)	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 12:07:28.327589+03	2026-02-16 12:07:28.327589+03
4	Фетисов Даниил Юрьевич	Младший сержант	18	Старший оператор роты (научной)	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-16 11:55:53.157545+03	2026-02-16 19:39:00.615951+03
69	Трепалин Павел Викторович	Старший лейтенант	10	Командир второго взвода	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-17 15:50:56.504507+03	2026-02-17 15:50:56.504507+03
70	Халупа Алексей Иванович	Лейтенант	11	Командир первого взвода	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-17 16:13:15.110627+03	2026-02-17 16:13:15.110627+03
71	Тарасенко Станислав Евгеньевич	Капитан	9	Командир роты	\N	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-17 16:15:03.895671+03	2026-02-17 16:15:03.895671+03
72	Арсёнов Алексей Владимирович	Сержант	17	Командир второго отделения	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-17 16:19:43.920156+03	2026-02-17 16:19:43.920156+03
73	Долгополов Андрей Андреевич	Прапорщик	14	Старшина роты	\N	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-17 16:31:11.170699+03	2026-02-17 16:31:11.170699+03
74	Антипов Егор Викторович	Сержант	17	Заместитель командира первого взвода	1 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-18 12:07:02.814919+03	2026-02-18 12:10:59.786767+03
75	Ермаков Владимир Александрович	Старший сержант	16	Заместитель командира второго взвода	2 взвод	\N	\N	3	\N	\N	IN_SERVICE	t	2026-02-18 12:18:01.708659+03	2026-02-18 12:18:01.708659+03
\.


--
-- Data for Name: phones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.phones (id, owner_id, model, color, imei_1, imei_2, serial_number, has_camera, has_recorder, storage_location, status, is_active, created_at, updated_at) FROM stdin;
1	71	Iphone	\N	\N	\N	\N	t	t	2	Сдан	t	2026-02-21 11:32:38.992421+03	2026-02-21 11:33:00.154577+03
\.


--
-- Data for Name: storage_and_passes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.storage_and_passes (id, asset_type, serial_number, model, manufacturer, status, assigned_to_id, capacity_gb, access_level, issue_date, return_date, notes, is_active, created_at, updated_at) FROM stdin;
1	electronic_pass	111509171104	\N	\N	in_use	14	\N	3	\N	\N	\N	t	2026-02-17 15:09:16.464859+03	2026-02-17 15:09:16.464859+03
2	electronic_pass	111509171150	\N	\N	in_use	27	\N	3	\N	\N	\N	t	2026-02-17 15:10:07.254231+03	2026-02-17 15:10:07.254231+03
3	electronic_pass	111509171109	\N	\N	in_use	40	\N	3	\N	\N	\N	t	2026-02-17 15:10:22.238356+03	2026-02-17 15:10:22.238356+03
4	electronic_pass	111509161656	\N	\N	in_use	28	\N	3	\N	\N	\N	t	2026-02-17 15:11:12.808223+03	2026-02-17 15:11:12.808223+03
5	electronic_pass	111509161652	\N	\N	in_use	18	\N	3	\N	\N	\N	t	2026-02-17 15:11:34.702792+03	2026-02-17 15:11:34.702792+03
6	electronic_pass	111509171113	\N	\N	in_use	30	\N	3	\N	\N	\N	t	2026-02-17 15:11:52.737639+03	2026-02-17 15:11:52.737639+03
7	electronic_pass	111509171204	\N	\N	in_use	31	\N	3	\N	\N	\N	t	2026-02-17 15:12:19.055854+03	2026-02-17 15:12:19.055854+03
8	electronic_pass	111509161518	\N	\N	in_use	20	\N	3	\N	\N	\N	t	2026-02-17 15:12:38.701587+03	2026-02-17 15:12:38.701587+03
9	electronic_pass	111509170903	\N	\N	in_use	21	\N	3	\N	\N	\N	t	2026-02-17 15:14:39.272765+03	2026-02-17 15:14:39.272765+03
10	electronic_pass	111509171145	\N	\N	in_use	34	\N	3	\N	\N	\N	t	2026-02-17 15:14:52.185507+03	2026-02-17 15:14:52.185507+03
11	electronic_pass	111509171006	\N	\N	in_use	22	\N	3	\N	\N	\N	t	2026-02-17 15:15:05.356787+03	2026-02-17 15:15:05.356787+03
12	electronic_pass	111509171156	\N	\N	in_use	23	\N	3	\N	\N	\N	t	2026-02-17 15:15:19.994381+03	2026-02-17 15:15:19.994381+03
13	electronic_pass	111509170846	\N	\N	in_use	35	\N	3	\N	\N	\N	t	2026-02-17 15:15:35.62724+03	2026-02-17 15:15:35.62724+03
14	electronic_pass	111509171140	\N	\N	in_use	37	\N	3	\N	\N	\N	t	2026-02-17 15:15:56.039129+03	2026-02-17 15:15:56.039129+03
15	electronic_pass	111509171059	\N	\N	in_use	38	\N	3	\N	\N	\N	t	2026-02-17 15:16:08.445463+03	2026-02-17 15:16:08.445463+03
16	electronic_pass	111509161509	\N	\N	in_use	26	\N	3	\N	\N	\N	t	2026-02-17 15:16:18.668327+03	2026-02-17 15:16:18.668327+03
17	electronic_pass	111509161453	\N	\N	in_use	6	\N	3	\N	\N	\N	t	2026-02-17 15:40:46.476527+03	2026-02-17 15:40:46.476527+03
18	electronic_pass	111509161505	\N	\N	in_use	16	\N	3	\N	\N	\N	t	2026-02-17 15:41:09.486322+03	2026-02-17 15:41:09.486322+03
19	electronic_pass	111509161707	\N	\N	in_use	9	\N	3	\N	\N	\N	t	2026-02-17 15:41:28.155671+03	2026-02-17 15:41:28.155671+03
20	electronic_pass	111509171417	\N	\N	in_use	4	\N	3	\N	\N	\N	t	2026-02-17 15:42:01.181639+03	2026-02-17 15:42:01.181639+03
21	electronic_pass	111509161436	\N	\N	in_use	29	\N	3	\N	\N	\N	t	2026-02-17 15:42:14.563778+03	2026-02-17 15:42:14.563778+03
22	electronic_pass	111510131621	\N	\N	in_use	13	\N	3	\N	\N	\N	t	2026-02-17 15:42:34.626113+03	2026-02-17 15:42:34.626113+03
23	electronic_pass	111509170949	\N	\N	in_use	33	\N	3	\N	\N	\N	t	2026-02-17 15:43:08.414416+03	2026-02-17 15:43:08.414416+03
24	electronic_pass	111509171409	\N	\N	in_use	10	\N	3	\N	\N	\N	t	2026-02-17 15:43:29.249581+03	2026-02-17 15:43:29.249581+03
25	electronic_pass	111509170835	\N	\N	in_use	19	\N	3	\N	\N	\N	t	2026-02-17 15:43:48.402551+03	2026-02-17 15:43:48.402551+03
26	electronic_pass	111509161703	\N	\N	in_use	2	\N	3	\N	\N	\N	t	2026-02-17 15:44:10.034905+03	2026-02-17 15:44:10.034905+03
27	electronic_pass	111509161540	\N	\N	in_use	32	\N	3	\N	\N	\N	t	2026-02-17 15:44:28.108058+03	2026-02-17 15:44:28.108058+03
28	electronic_pass	111509161600	\N	\N	in_use	7	\N	3	\N	\N	\N	t	2026-02-17 15:44:47.464126+03	2026-02-17 15:44:47.464126+03
29	electronic_pass	111509170851	\N	\N	in_use	17	\N	3	\N	\N	\N	t	2026-02-17 15:45:07.360415+03	2026-02-17 15:45:07.360415+03
30	electronic_pass	111509161514	\N	\N	in_use	15	\N	3	\N	\N	\N	t	2026-02-17 15:45:25.450285+03	2026-02-17 15:45:25.450285+03
31	electronic_pass	111509221521	\N	\N	in_use	39	\N	3	\N	\N	\N	t	2026-02-17 15:45:40.05824+03	2026-02-17 15:45:40.05824+03
32	electronic_pass	111509161700	\N	\N	in_use	8	\N	3	\N	\N	\N	t	2026-02-17 15:45:53.334509+03	2026-02-17 15:45:53.334509+03
33	electronic_pass	111509171027	\N	\N	in_use	1	\N	3	\N	\N	\N	t	2026-02-17 15:46:09.31735+03	2026-02-17 15:46:09.31735+03
34	electronic_pass	111509161529	\N	\N	in_use	12	\N	3	\N	\N	\N	t	2026-02-17 15:46:25.863413+03	2026-02-17 15:46:25.863413+03
35	electronic_pass	111509161555	\N	\N	in_use	3	\N	3	\N	\N	\N	t	2026-02-17 15:46:48.278368+03	2026-02-17 15:46:48.278368+03
36	electronic_pass	111509221532	\N	\N	in_use	24	\N	3	\N	\N	\N	t	2026-02-17 15:47:01.653708+03	2026-02-17 15:47:01.653708+03
37	electronic_pass	11150916524	\N	\N	in_use	25	\N	3	\N	\N	\N	t	2026-02-17 15:47:14.197555+03	2026-02-17 15:47:14.197555+03
38	electronic_pass	111509170840	\N	\N	in_use	11	\N	3	\N	\N	\N	t	2026-02-17 15:47:28.668325+03	2026-02-17 15:47:28.668325+03
39	electronic_pass	111509161441	\N	\N	in_use	5	\N	3	\N	\N	\N	t	2026-02-17 15:47:43.664062+03	2026-02-17 15:47:43.664062+03
40	electronic_pass	031.51916	\N	\N	in_use	36	\N	3	\N	\N	\N	t	2026-02-17 15:48:37.788158+03	2026-02-17 15:48:37.788158+03
42	flash_drive	386430-403		DEPO	in_use	1	16	\N	\N	2026-02-17 18:52:48.852254+03		f	2026-02-17 15:51:50.720749+03	2026-02-17 16:06:26.773155+03
54	flash_drive	20003F2A	Blue	DEPO	in_use	71	16	\N	\N	\N	\N	t	2026-02-17 16:16:19.412902+03	2026-02-17 16:16:19.412902+03
55	flash_drive	20003F86	Blue	DEPO	in_use	71	16	\N	\N	\N	\N	t	2026-02-17 16:16:57.563451+03	2026-02-17 16:16:57.563451+03
56	flash_drive	200047E6	Blue	DEPO	in_use	71	16	\N	\N	\N	\N	t	2026-02-17 16:17:17.617759+03	2026-02-17 16:17:17.617759+03
57	flash_drive	200047A9	Blue	DEPO	in_use	71	16	\N	\N	\N	\N	t	2026-02-17 16:17:34.015879+03	2026-02-17 16:17:34.015879+03
58	flash_drive	20005873	Blue	DEPO	in_use	69	16	\N	\N	\N	\N	t	2026-02-17 16:18:09.632527+03	2026-02-17 16:18:09.632527+03
59	flash_drive	386430-092	Red	DEPO	in_use	72	16	\N	\N	\N	\N	t	2026-02-17 16:20:15.819938+03	2026-02-17 16:20:15.819938+03
60	flash_drive	386409-046	Red	DEPO	in_use	28	16	\N	\N	\N	\N	t	2026-02-17 16:20:34.227966+03	2026-02-17 16:20:34.227966+03
61	flash_drive	386430-090	Red	DEPO	in_use	21	16	\N	\N	\N	\N	t	2026-02-17 16:20:54.5584+03	2026-02-17 16:20:54.5584+03
62	flash_drive	386409-042	Red	DEPO	in_use	26	16	\N	\N	\N	\N	t	2026-02-17 16:21:18.958146+03	2026-02-17 16:21:18.958146+03
63	flash_drive	386430-107	Red	DEPO	in_use	23	16	\N	\N	\N	\N	t	2026-02-17 16:21:36.694134+03	2026-02-17 16:21:36.694134+03
64	flash_drive	386409-047	Red	DEPO	in_use	38	16	\N	\N	\N	\N	t	2026-02-17 16:21:53.338233+03	2026-02-17 16:21:53.338233+03
65	flash_drive	386407-559	Red	DEPO	stock	\N	16	\N	\N	\N	\N	t	2026-02-20 11:33:54.863567+03	2026-02-20 11:33:54.863567+03
66	flash_drive	386407-584	Red	DEPO	stock	\N	16	\N	\N	\N	\N	t	2026-02-20 11:34:10.582758+03	2026-02-20 11:34:10.582758+03
67	flash_drive	386407-586	Red	DEPO	stock	\N	16	\N	\N	\N	\N	t	2026-02-20 11:34:25.966638+03	2026-02-20 11:34:25.966638+03
68	flash_drive	386430-592	Red	DEPO	stock	\N	16	\N	\N	\N	\N	t	2026-02-20 11:34:41.000683+03	2026-02-20 11:34:41.000683+03
69	flash_drive	386407-594	Red	DEPO	stock	\N	16	\N	\N	\N	\N	t	2026-02-20 11:34:59.757818+03	2026-02-20 11:34:59.757818+03
70	flash_drive	386430-821	Red	DEPO	stock	\N	16	\N	\N	\N	\N	t	2026-02-20 11:35:14.145093+03	2026-02-20 11:35:14.145093+03
71	flash_drive	386409-025	Red	DEPO	stock	\N	16	\N	\N	\N	\N	t	2026-02-20 11:35:26.616871+03	2026-02-20 11:35:26.616871+03
72	flash_drive	386409-027	Red	DEPO	stock	\N	16	\N	\N	\N	\N	t	2026-02-20 11:35:39.837436+03	2026-02-20 11:35:39.837436+03
73	flash_drive	386409-051	Red	DEPO	stock	\N	16	\N	\N	\N	\N	t	2026-02-20 11:35:50.555343+03	2026-02-20 11:35:50.555343+03
74	flash_drive	386407-587	Red	DEPO	stock	\N	16	\N	\N	\N	\N	t	2026-02-20 11:36:08.753654+03	2026-02-20 11:36:08.753654+03
76	flash_drive	386407-599	Red	DEPO	stock	\N	16	\N	\N	\N	Кудрявцев	t	2026-03-16 07:20:57.038165+03	2026-03-16 07:20:57.038165+03
77	flash_drive	386407-478	Red	DEPO	stock	\N	16	\N	\N	\N	Кудрявцев	t	2026-03-16 07:21:19.406646+03	2026-03-16 07:21:19.406646+03
43	flash_drive	386407-403	Red	DEPO	in_use	1	16	\N	\N	\N		t	2026-02-17 15:52:16.849975+03	2026-03-25 06:33:44.168765+03
45	flash_drive	386407-404	Red	DEPO	in_use	33	16	\N	\N	\N		t	2026-02-17 16:07:40.161668+03	2026-03-25 06:33:52.611708+03
47	flash_drive	386407-409	Red	DEPO	in_use	13	16	\N	\N	\N		t	2026-02-17 16:10:33.931264+03	2026-03-25 06:34:01.106048+03
48	flash_drive	386407-416	Red	DEPO	in_use	10	16	\N	\N	\N		t	2026-02-17 16:11:19.558858+03	2026-03-25 06:34:08.521799+03
49	flash_drive	386407-430	Red	DEPO	in_use	6	16	\N	\N	\N		t	2026-02-17 16:11:41.314728+03	2026-03-25 06:34:16.573278+03
50	flash_drive	386407-446	Red	DEPO	in_use	3	16	\N	\N	\N		t	2026-02-17 16:11:58.547378+03	2026-03-25 06:34:25.164385+03
51	flash_drive	386407-456	Red	DEPO	in_use	2	16	\N	\N	\N		t	2026-02-17 16:12:20.15656+03	2026-03-25 06:34:33.925835+03
53	flash_drive	386407-476	Red	DEPO	in_use	5	16	\N	\N	\N		t	2026-02-17 16:14:25.836157+03	2026-03-25 06:34:50.372227+03
44	flash_drive	386430-191	Red	DEPO	in_use	69	16	\N	\N	\N		t	2026-02-17 16:07:13.966026+03	2026-03-25 06:35:06.735932+03
78	flash_drive	386407-410	Red	DEPO	stock	\N	16	\N	\N	\N	Васильев	t	2026-03-16 07:21:44.699569+03	2026-03-16 07:21:44.699569+03
79	flash_drive	386407-082	Red	DEPO	in_use	71	15	\N	\N	\N	\N	t	2026-03-16 07:22:13.567821+03	2026-03-16 07:22:13.567821+03
82	flash_drive	386407-081	Red	DEPO	stock	\N	16	\N	\N	\N	\N	f	2026-03-16 07:23:26.504828+03	2026-03-16 07:23:34.098468+03
83	flash_drive	386407-453	Red	DEPO	in_use	73	16	\N	\N	\N	\N	t	2026-03-16 07:25:46.176074+03	2026-03-16 07:25:46.176074+03
46	flash_drive	386408-899	Red	DEPO	in_use	15	16	\N	\N	\N		t	2026-02-17 16:08:06.155215+03	2026-03-25 06:33:33.086398+03
52	flash_drive	386407-462	Red	DEPO	in_use	70	16	\N	\N	\N		t	2026-02-17 16:14:03.036145+03	2026-03-25 06:34:41.411012+03
\.


--
-- Data for Name: storage_devices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.storage_devices (id, equipment_id, device_type, inventory_number, serial_number, manufacturer, model, capacity_gb, interface, status, location, notes, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, full_name, role, is_active, last_login, created_at) FROM stdin;
1	rapt0r111	$argon2id$v=19$m=65536,t=3,p=4$NGODoabc9VgdNduWzMT2cA$b0aW6Q+Q6vidAzYHFtW1aylVEItXsNyuRqbb9WgH7dg	Anton	admin	t	2026-03-27 13:15:39.516411+03	2026-02-16 11:52:30.053558+03
\.


--
-- Name: equipment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.equipment_id_seq', 52, true);


--
-- Name: equipment_movements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.equipment_movements_id_seq', 1, false);


--
-- Name: personnel_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.personnel_id_seq', 75, true);


--
-- Name: phones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.phones_id_seq', 1, true);


--
-- Name: storage_and_passes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.storage_and_passes_id_seq', 83, true);


--
-- Name: storage_devices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.storage_devices_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: equipment_movements equipment_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_movements
    ADD CONSTRAINT equipment_movements_pkey PRIMARY KEY (id);


--
-- Name: equipment equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (id);


--
-- Name: personnel personnel_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personnel
    ADD CONSTRAINT personnel_pkey PRIMARY KEY (id);


--
-- Name: phones phones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phones
    ADD CONSTRAINT phones_pkey PRIMARY KEY (id);


--
-- Name: storage_and_passes storage_and_passes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_and_passes
    ADD CONSTRAINT storage_and_passes_pkey PRIMARY KEY (id);


--
-- Name: storage_devices storage_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_devices
    ADD CONSTRAINT storage_devices_pkey PRIMARY KEY (id);


--
-- Name: equipment uq_equipment_inventory; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT uq_equipment_inventory UNIQUE (inventory_number);


--
-- Name: phones uq_phone_imei_1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phones
    ADD CONSTRAINT uq_phone_imei_1 UNIQUE (imei_1);


--
-- Name: storage_devices uq_storage_inventory; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_devices
    ADD CONSTRAINT uq_storage_inventory UNIQUE (inventory_number);


--
-- Name: storage_and_passes uq_storage_passes_serial; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_and_passes
    ADD CONSTRAINT uq_storage_passes_serial UNIQUE (serial_number);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_equipment_current_owner_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_equipment_current_owner_id ON public.equipment USING btree (current_owner_id);


--
-- Name: ix_equipment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_equipment_id ON public.equipment USING btree (id);


--
-- Name: ix_equipment_inventory_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_equipment_inventory_number ON public.equipment USING btree (inventory_number);


--
-- Name: ix_equipment_is_personal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_equipment_is_personal ON public.equipment USING btree (is_personal);


--
-- Name: ix_equipment_mni_serial_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_equipment_mni_serial_number ON public.equipment USING btree (mni_serial_number);


--
-- Name: ix_equipment_movements_equipment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_equipment_movements_equipment_id ON public.equipment_movements USING btree (equipment_id);


--
-- Name: ix_equipment_movements_from_person_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_equipment_movements_from_person_id ON public.equipment_movements USING btree (from_person_id);


--
-- Name: ix_equipment_movements_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_equipment_movements_id ON public.equipment_movements USING btree (id);


--
-- Name: ix_equipment_movements_to_person_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_equipment_movements_to_person_id ON public.equipment_movements USING btree (to_person_id);


--
-- Name: ix_equipment_serial_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_equipment_serial_number ON public.equipment USING btree (serial_number);


--
-- Name: ix_personnel_full_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_personnel_full_name ON public.personnel USING btree (full_name);


--
-- Name: ix_personnel_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_personnel_id ON public.personnel USING btree (id);


--
-- Name: ix_personnel_personal_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_personnel_personal_number ON public.personnel USING btree (personal_number);


--
-- Name: ix_personnel_service_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_personnel_service_number ON public.personnel USING btree (service_number);


--
-- Name: ix_phones_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_phones_id ON public.phones USING btree (id);


--
-- Name: ix_phones_imei_1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_phones_imei_1 ON public.phones USING btree (imei_1);


--
-- Name: ix_storage_and_passes_assigned_to_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_storage_and_passes_assigned_to_id ON public.storage_and_passes USING btree (assigned_to_id);


--
-- Name: ix_storage_and_passes_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_storage_and_passes_id ON public.storage_and_passes USING btree (id);


--
-- Name: ix_storage_and_passes_serial_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_storage_and_passes_serial_number ON public.storage_and_passes USING btree (serial_number);


--
-- Name: ix_storage_devices_equipment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_storage_devices_equipment_id ON public.storage_devices USING btree (equipment_id);


--
-- Name: ix_storage_devices_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_storage_devices_id ON public.storage_devices USING btree (id);


--
-- Name: ix_storage_devices_inventory_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_storage_devices_inventory_number ON public.storage_devices USING btree (inventory_number);


--
-- Name: ix_storage_devices_serial_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_storage_devices_serial_number ON public.storage_devices USING btree (serial_number);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: equipment equipment_current_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_current_owner_id_fkey FOREIGN KEY (current_owner_id) REFERENCES public.personnel(id) ON DELETE SET NULL;


--
-- Name: equipment_movements equipment_movements_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_movements
    ADD CONSTRAINT equipment_movements_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: equipment_movements equipment_movements_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_movements
    ADD CONSTRAINT equipment_movements_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE CASCADE;


--
-- Name: equipment_movements equipment_movements_from_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_movements
    ADD CONSTRAINT equipment_movements_from_person_id_fkey FOREIGN KEY (from_person_id) REFERENCES public.personnel(id);


--
-- Name: equipment_movements equipment_movements_to_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_movements
    ADD CONSTRAINT equipment_movements_to_person_id_fkey FOREIGN KEY (to_person_id) REFERENCES public.personnel(id);


--
-- Name: phones phones_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phones
    ADD CONSTRAINT phones_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.personnel(id) ON DELETE CASCADE;


--
-- Name: storage_and_passes storage_and_passes_assigned_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_and_passes
    ADD CONSTRAINT storage_and_passes_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES public.personnel(id) ON DELETE SET NULL;


--
-- Name: storage_devices storage_devices_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_devices
    ADD CONSTRAINT storage_devices_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict sghPJwoQYp13v7VT8NRuCN2L8Ff1a4LgCJ83UYCsLCkC6ed7DRmZMwSda4ISz4P


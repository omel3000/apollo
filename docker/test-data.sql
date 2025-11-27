-- Dane testowe Apollo (firma gastronomiczna) - PEŁNA BAZA DANYCH - listopad/grudzień 2025
-- Wszystkie hasła: 1234 (hash: $2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle)
BEGIN;

TRUNCATE TABLE
    public.absences,
    public.approval_log,
    public.audit_logs,
    public.availability,
    public.messages,
    public.period_closures,
    public.schedule,
    public.work_reports,
    public.user_projects,
    public.projects,
    public.users
RESTART IDENTITY CASCADE;

-- ============================================================================
-- UŻYTKOWNICY (25 osób: 2 admin, 3 HR, 20 workers)
-- ============================================================================
INSERT INTO public.users (user_id, first_name, last_name, email, phone_number, password_hash, role, registration_date, account_status, password_reset_token, birth_date, address)
VALUES
    -- ADMINISTRACJA
    (1, 'Agnieszka', 'Maj', 'adm@op.pl', '+48 600 111 222', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'admin', '2023-08-14 09:15:00', 'aktywny', NULL, '1985-04-18', 'ul. Dolna 12, Warszawa'),
    (2, 'Piotr', 'Kowalski', 'piotr.kowalski@apollo-catering.pl', '+48 600 222 333', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'admin', '2023-09-20 10:00:00', 'aktywny', NULL, '1982-07-25', 'ul. Marszałkowska 45, Warszawa'),
    
    -- DZIAŁ HR
    (3, 'Bartek', 'Radwan', 'hr@op.pl', '+48 600 333 111', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'hr', '2023-09-02 08:45:00', 'aktywny', NULL, '1988-11-02', 'ul. Górnośląska 5, Warszawa'),
    (4, 'Monika', 'Wiśniewska', 'monika.wisniewska@apollo-catering.pl', '+48 601 123 456', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'hr', '2024-02-15 09:30:00', 'aktywny', NULL, '1990-03-14', 'ul. Puławska 120, Warszawa'),
    (5, 'Tomasz', 'Lewandowski', 'tomasz.lewandowski@apollo-catering.pl', '+48 602 234 567', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'hr', '2024-03-01 08:00:00', 'aktywny', NULL, '1987-09-08', 'ul. Nowy Świat 28, Warszawa'),
    
    -- SZEFOWIE KUCHNI (Senior)
    (6, 'Celina', 'Wróbel', 'celina.wrobel@apollo-catering.pl', '+48 601 444 555', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-01-10 07:55:00', 'aktywny', NULL, '1990-02-21', 'ul. Różana 22, Warszawa'),
    (7, 'Damian', 'Lis', 'damian.lis@apollo-catering.pl', '+48 602 999 101', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-03-04 06:40:00', 'aktywny', NULL, '1992-07-12', 'ul. Pileckiego 3, Warszawa'),
    (8, 'Karolina', 'Szymańska', 'karolina.szymanska@apollo-catering.pl', '+48 603 345 678', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-01-20 07:00:00', 'aktywny', NULL, '1989-06-15', 'ul. Żwirki i Wigury 18, Warszawa'),
    
    -- KUCHARZE (Mid/Junior)
    (9, 'Jakub', 'Adamczyk', 'jakub.adamczyk@apollo-catering.pl', '+48 604 456 789', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-04-10 06:30:00', 'aktywny', NULL, '1995-01-30', 'ul. Grochowska 230, Warszawa'),
    (10, 'Natalia', 'Dąbrowska', 'natalia.dabrowska@apollo-catering.pl', '+48 605 567 890', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-05-05 07:15:00', 'aktywny', NULL, '1993-08-22', 'ul. Wawelska 5, Warszawa'),
    (11, 'Paweł', 'Krawczyk', 'pawel.krawczyk@apollo-catering.pl', '+48 606 678 901', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-06-12 06:45:00', 'aktywny', NULL, '1994-11-05', 'ul. Targowa 56, Warszawa'),
    (12, 'Magdalena', 'Piotrowska', 'magdalena.piotrowska@apollo-catering.pl', '+48 607 789 012', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-07-01 07:30:00', 'aktywny', NULL, '1996-04-18', 'ul. Modlińska 120, Warszawa'),
    
    -- CUKIERNICY/PIEKARZE
    (13, 'Ewa', 'Kaczor', 'ewa.kaczor@apollo-catering.pl', '+48 603 210 310', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-05-15 08:10:00', 'aktywny', NULL, '1994-05-06', 'ul. Woronicza 18, Warszawa'),
    (14, 'Robert', 'Zając', 'robert.zajac@apollo-catering.pl', '+48 608 890 123', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-05-20 06:00:00', 'aktywny', NULL, '1991-10-12', 'ul. Bielańska 14, Warszawa'),
    (15, 'Anna', 'Michalska', 'anna.michalska@apollo-catering.pl', '+48 609 901 234', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-06-18 07:45:00', 'aktywny', NULL, '1997-02-28', 'ul. Solidarności 88, Warszawa'),
    
    -- LOGISTYKA/TRANSPORT
    (16, 'Filip', 'Nowak', 'filip.nowak@apollo-catering.pl', '+48 604 630 730', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-06-01 07:20:00', 'aktywny', NULL, '1991-12-01', 'ul. Jana III Sobieskiego 102, Warszawa'),
    (17, 'Krzysztof', 'Wojciechowski', 'krzysztof.wojciechowski@apollo-catering.pl', '+48 610 012 345', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-07-10 05:30:00', 'aktywny', NULL, '1988-05-20', 'ul. Marywilska 44, Warszawa'),
    (18, 'Łukasz', 'Kamiński', 'lukasz.kaminski@apollo-catering.pl', '+48 611 123 456', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-08-05 06:15:00', 'aktywny', NULL, '1993-07-07', 'ul. Prymasa Tysiąclecia 76, Warszawa'),
    
    -- OBSŁUGA/SERWIS
    (19, 'Gabriela', 'Sowa', 'gabriela.sowa@apollo-catering.pl', '+48 605 880 990', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-07-22 09:05:00', 'aktywny', NULL, '1996-09-30', 'ul. Puławska 44, Warszawa'),
    (20, 'Michał', 'Włodarczyk', 'michal.wlodarczyk@apollo-catering.pl', '+48 612 234 567', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-08-15 08:30:00', 'aktywny', NULL, '1995-12-14', 'ul. Chłodna 22, Warszawa'),
    (21, 'Joanna', 'Rutkowska', 'joanna.rutkowska@apollo-catering.pl', '+48 613 345 678', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-09-01 09:00:00', 'aktywny', NULL, '1998-03-25', 'ul. Kazimierzowska 56, Warszawa'),
    (22, 'Marcin', 'Olszewski', 'marcin.olszewski@apollo-catering.pl', '+48 614 456 789', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-09-10 08:45:00', 'aktywny', NULL, '1997-06-11', 'ul. Polna 18, Warszawa'),
    
    -- MAGAZYN/ZAOPATRZENIE
    (23, 'Barbara', 'Sikora', 'barbara.sikora@apollo-catering.pl', '+48 615 567 890', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-09-20 07:00:00', 'aktywny', NULL, '1992-01-08', 'ul. Ostrobramska 101, Warszawa'),
    (24, 'Grzegorz', 'Baran', 'grzegorz.baran@apollo-catering.pl', '+48 616 678 901', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-10-01 06:30:00', 'aktywny', NULL, '1990-08-19', 'ul. Fieldorfa 12, Warszawa'),
    (25, 'Dorota', 'Mazur', 'dorota.mazur@apollo-catering.pl', '+48 617 789 012', '$2b$12$LCTgBWl9SsEpNuj1CLglUOE1tEUR8mzsyNCcNCH16Lz9PLiFAizle', 'worker', '2024-10-15 07:30:00', 'aktywny', NULL, '1994-11-22', 'ul. Bokserska 66, Warszawa');

-- ============================================================================
-- PROJEKTY (12 projektów: restauracje, catering, eventy)
-- ============================================================================
INSERT INTO public.projects (project_id, project_name, description, owner_user_id, status, created_by_user_id, created_at, time_type)
VALUES
    -- Stałe restauracje
    (1, 'Restauracja Mokotów - dzienna obsługa', 'Codzienna produkcja menu lunchowego i kolacyjnego w lokalu na Mokotowie. 120 miejsc, kuchnia polska fusion.', 6, 'aktywny', 1, '2025-01-05 08:00:00', 'constant'),
    (2, 'Restauracja Śródmieście Premium', 'Fine dining w centrum Warszawy, 80 miejsc, menu degustacyjne i à la carte.', 7, 'aktywny', 1, '2024-11-10 09:00:00', 'constant'),
    (3, 'Bistro Praga - weekend brunch', 'Weekendowe brunche i niedzielne lunche, 60 miejsc, kuchnia śródziemnomorska.', 8, 'aktywny', 2, '2025-02-20 10:15:00', 'from_to'),
    
    -- Programy lunchowe dla firm
    (4, 'TechWave Corporate Lunches', 'Dostawy lunchów premium (pon-pt) do siedziby TechWave na Służewcu. 250 porcji dziennie.', 16, 'aktywny', 1, '2025-08-22 09:30:00', 'constant'),
    (5, 'FinCorp Daily Meals', 'Lunche i śniadania dla FinCorp Tower, 180 porcji, menu rotacyjne co tydzień.', 16, 'aktywny', 2, '2025-09-05 08:00:00', 'constant'),
    (6, 'StartupHub Food Service', 'Catering dla coworkingu StartupHub, 100-150 porcji dziennie, elastyczne menu.', 17, 'aktywny', 1, '2025-10-01 07:45:00', 'constant'),
    
    -- Eventy i bankiety
    (7, 'Eventy świąteczne 2025', 'Obsługa kolacji wigilijnych, bankietów firmowych i przyjęć noworocznych (15.11-31.12).', 7, 'aktywny', 2, '2025-09-15 10:00:00', 'from_to'),
    (8, 'Wesela i przyjęcia rodzinne', 'Catering na wesela, chrzciny, komunie, jubileusze. Obsługa kompleksowa.', 19, 'aktywny', 1, '2024-12-01 11:00:00', 'from_to'),
    (9, 'Konferencje biznesowe', 'Catering na konferencje, szkolenia, warsztaty. Coffee breaks i lunche.', 20, 'aktywny', 2, '2025-07-10 09:30:00', 'from_to'),
    
    -- Specjalistyczne
    (10, 'Produkcja deserów i ciast', 'Ciastkarnia własna - produkcja deserów na potrzeby wszystkich projektów + sprzedaż detaliczna.', 13, 'aktywny', 1, '2024-10-15 08:00:00', 'constant'),
    (11, 'Logistyka i dystrybucja', 'Zarządzanie flotą, transport, pakowanie, dostawa do wszystkich klientów.', 16, 'aktywny', 1, '2024-08-01 06:30:00', 'constant'),
    (12, 'Magazyn centralny - zaopatrzenie', 'Zarządzanie magazynem, inwentaryzacje, zamówienia surowców, kontrola jakości.', 23, 'aktywny', 2, '2024-09-01 07:00:00', 'constant');

-- ============================================================================
-- PRZYPISANIA UŻYTKOWNIKÓW DO PROJEKTÓW (user_projects)
-- ============================================================================
INSERT INTO public.user_projects (user_project_id, user_id, project_id, assigned_at)
VALUES
    -- Restauracja Mokotów (projekt 1): szefowie kuchni + kucharze + obsługa
    (1, 6, 1, '2024-02-01 07:30:00'),  -- Celina (szef)
    (2, 9, 1, '2024-04-15 06:30:00'),  -- Jakub (kucharz)
    (3, 10, 1, '2024-05-10 07:15:00'), -- Natalia (kucharz)
    (4, 11, 1, '2024-06-20 06:45:00'), -- Paweł (kucharz)
    (5, 19, 1, '2024-08-01 09:05:00'), -- Gabriela (serwis)
    (6, 20, 1, '2024-08-20 08:30:00'), -- Michał (serwis)
    
    -- Restauracja Śródmieście (projekt 2): top team
    (7, 7, 2, '2024-11-15 06:00:00'),  -- Damian (szef)
    (8, 8, 2, '2024-12-01 07:00:00'),  -- Karolina (szef)
    (9, 12, 2, '2024-07-05 07:30:00'), -- Magdalena (kucharz)
    (10, 21, 2, '2024-09-05 09:00:00'), -- Joanna (serwis)
    (11, 22, 2, '2024-09-15 08:45:00'), -- Marcin (serwis)
    
    -- Bistro Praga (projekt 3): weekend team
    (12, 8, 3, '2025-03-01 07:00:00'),  -- Karolina
    (13, 10, 3, '2025-03-05 07:15:00'), -- Natalia
    (14, 21, 3, '2025-03-10 09:00:00'), -- Joanna
    
    -- TechWave Lunches (projekt 4): produkcja + logistyka
    (15, 6, 4, '2025-08-25 07:30:00'),  -- Celina
    (16, 9, 4, '2025-08-25 06:30:00'),  -- Jakub
    (17, 11, 4, '2025-08-25 06:45:00'), -- Paweł
    (18, 16, 4, '2025-08-25 07:20:00'), -- Filip (logistyka)
    (19, 17, 4, '2025-08-25 05:30:00'), -- Krzysztof (logistyka)
    
    -- FinCorp Meals (projekt 5): produkcja + transport
    (20, 7, 5, '2025-09-10 06:00:00'),  -- Damian
    (21, 12, 5, '2025-09-10 07:30:00'), -- Magdalena
    (22, 16, 5, '2025-09-10 07:20:00'), -- Filip
    (23, 18, 5, '2025-09-10 06:15:00'), -- Łukasz (transport)
    
    -- StartupHub (projekt 6): mały zespół
    (24, 10, 6, '2025-10-05 07:15:00'), -- Natalia
    (25, 17, 6, '2025-10-05 05:30:00'), -- Krzysztof
    
    -- Eventy świąteczne (projekt 7): wszyscy w potrzebie
    (26, 6, 7, '2025-10-01 07:30:00'),  -- Celina
    (27, 7, 7, '2025-10-01 06:00:00'),  -- Damian
    (28, 8, 7, '2025-10-01 07:00:00'),  -- Karolina
    (29, 9, 7, '2025-10-05 06:30:00'),  -- Jakub
    (30, 10, 7, '2025-10-05 07:15:00'), -- Natalia
    (31, 11, 7, '2025-10-05 06:45:00'), -- Paweł
    (32, 12, 7, '2025-10-05 07:30:00'), -- Magdalena
    (33, 19, 7, '2025-10-10 09:05:00'), -- Gabriela (serwis)
    (34, 20, 7, '2025-10-10 08:30:00'), -- Michał (serwis)
    (35, 21, 7, '2025-10-10 09:00:00'), -- Joanna (serwis)
    (36, 22, 7, '2025-10-10 08:45:00'), -- Marcin (serwis)
    (37, 16, 7, '2025-10-12 07:20:00'), -- Filip (logistyka)
    (38, 17, 7, '2025-10-12 05:30:00'), -- Krzysztof (logistyka)
    
    -- Wesela i przyjęcia (projekt 8): obsługa eventowa
    (39, 19, 8, '2024-12-05 09:05:00'), -- Gabriela
    (40, 20, 8, '2024-12-05 08:30:00'), -- Michał
    (41, 21, 8, '2024-12-05 09:00:00'), -- Joanna
    (42, 22, 8, '2024-12-05 08:45:00'), -- Marcin
    (43, 7, 8, '2024-12-05 06:00:00'),  -- Damian (kuchnia event)
    
    -- Konferencje (projekt 9): catering biznesowy
    (44, 20, 9, '2025-07-15 08:30:00'), -- Michał
    (45, 21, 9, '2025-07-15 09:00:00'), -- Joanna
    (46, 11, 9, '2025-07-15 06:45:00'), -- Paweł (kuchnia)
    
    -- Ciastkarnia (projekt 10): cukiernicy
    (47, 13, 10, '2024-10-20 08:10:00'), -- Ewa
    (48, 14, 10, '2024-10-20 06:00:00'), -- Robert
    (49, 15, 10, '2024-10-20 07:45:00'), -- Anna
    
    -- Logistyka (projekt 11): kierowcy + koordynacja
    (50, 16, 11, '2024-08-05 07:20:00'), -- Filip
    (51, 17, 11, '2024-08-05 05:30:00'), -- Krzysztof
    (52, 18, 11, '2024-08-10 06:15:00'), -- Łukasz
    
    -- Magazyn (projekt 12): magazynierzy
    (53, 23, 12, '2024-09-25 07:00:00'), -- Barbara
    (54, 24, 12, '2024-10-05 06:30:00'), -- Grzegorz
    (55, 25, 12, '2024-10-20 07:30:00'); -- Dorota

-- ============================================================================
-- KOMUNIKATY SYSTEMOWE (20 wiadomości)
-- ============================================================================
INSERT INTO public.messages (message_id, title, content, created_at, is_active)
VALUES
    (1, 'Inwentaryzacja magazynu 15 grudnia', 'Zespół produkcyjny proszony jest o zakończenie rozchodów surowców do 14.12 godz. 18:00. W dniu inwentaryzacji magazyn będzie nieczynny.', '2025-11-30 08:00:00', true),
    (2, 'Zwiększenie wolumenu TechWave od 03.11', 'Od 03.11 zwiększamy produkcję lunchów dla TechWave do 320 porcji dziennie. Proszę o dostosowanie harmonogramów.', '2025-10-28 09:45:00', true),
    (3, 'Nowe menu świąteczne - degustacja 25.11', 'Degustacja nowego menu świątecznego odbędzie się 25.11 o godz. 15:00 w kuchni głównej. Obecność szefów kuchni obowiązkowa.', '2025-11-18 10:30:00', true),
    (4, 'Szkolenie BHP - grudzień 2025', 'Obowiązkowe szkolenie BHP dla wszystkich pracowników produkcji w dniach 9-10.12. Szczegółowy harmonogram w załączniku.', '2025-11-25 08:15:00', true),
    (5, 'Zamknięcie okresu rozliczeniowego - październik', 'Okres październik 2025 został zamknięty. Wszelkie korekty raportów wymagają zgłoszenia do HR.', '2025-11-05 14:30:00', false),
    (6, 'Nowy kontrakt - StartupHub', 'Gratulacje! Wygraliśmy przetarg na catering dla StartupHub. Start 01.10, szczegóły na spotkaniu zespołu.', '2025-09-28 11:00:00', false),
    (7, 'Awaria chłodni nr 2 - PILNE', 'Chłodnia nr 2 jest niesprawna. Wszystkie produkty przeniesiono do chłodni zapasowej. Naprawa w toku.', '2025-11-22 06:45:00', true),
    (8, 'Zmiana dostawcy warzyw od grudnia', 'Od 01.12 zmieniamy dostawcę warzyw na FreshFarm. Nowe standardy jakości i opakowania - instrukcja w intranecie.', '2025-11-27 09:00:00', true),
    (9, 'Święta - harmonogram pracy', 'Harmonogram pracy na okres 20.12 - 05.01 został opublikowany. Sprawdźcie swoje grafiki w systemie.', '2025-12-01 10:00:00', true),
    (10, 'Nowe samochody dostawcze', 'Flota została wzmocniona o 2 nowe samochody chłodnie. Szkolenie dla kierowców 02.12 o 8:00.', '2025-11-29 07:30:00', true),
    (11, 'Kontrola sanepidu - 18.11 wynik pozytywny', 'Kontrola sanepidu zakończona sukcesem. Brak uwag. Świetna robota zespołu!', '2025-11-19 15:00:00', false),
    (12, 'Promocja - lunche korporacyjne', 'Nowa akcja promocyjna dla klientów korporacyjnych. Szczegóły w prezentacji dla team leaderów.', '2025-11-10 11:30:00', false),
    (13, 'System raportowania - aktualizacja 20.11', 'W dniu 20.11 o godz. 22:00 system będzie niedostępny przez ok. 2h ze względu na aktualizację.', '2025-11-17 14:00:00', false),
    (14, 'Rekrutacja - nowi pracownicy grudzień', 'W grudniu dołączą do nas 3 nowe osoby: 2 kucharzy i 1 osoba do obsługi. Powitajmy ich ciepło!', '2025-11-28 10:45:00', true),
    (15, 'Karta świąteczna - degustacja dla klientów', 'Zapraszamy klientów na degustację karty świątecznej 05.12 godz. 17:00. Przygotowania od 14:00.', '2025-12-01 09:15:00', true),
    (16, 'Bezpieczeństwo - parkingi', 'Przypominamy o zamykaniu samochodów i zabieraniu wartościowych rzeczy. Odnotowano kradzież w okolicy.', '2025-11-21 08:00:00', true),
    (17, 'Premie za listopad - wypłata 10.12', 'Premie wynikowe za listopad zostaną wypłacone 10.12 wraz z wynagrodzeniem zasadniczym.', '2025-12-02 12:00:00', true),
    (18, 'Catering dla Apollo - spotkanie wigilijne', 'Spotkanie wigilijne firmy Apollo odbędzie się 22.12. Menu i harmonogram wkrótce.', '2025-11-26 13:30:00', true),
    (19, 'Nowy system zamówień surowców - szkolenie', 'Szkolenie z nowego systemu zamówień dla team leaderów: 04.12 godz. 16:00, sala konferencyjna.', '2025-11-30 11:00:00', true),
    (20, 'Gratulacje - 1000 posiłków dziennie!', 'Osiągnęliśmy kamień milowy - 1000 posiłków dziennie! To zasługa Was wszystkich. Dziękujemy!', '2025-11-15 16:00:00', false);

-- ============================================================================
-- STATUSY OKRESÓW ROZLICZENIOWYCH
-- ============================================================================
INSERT INTO public.period_closures (period_closure_id, year, month, status, locked_by_user_id, locked_at, unlocked_at, notes)
VALUES
    (1, 2025, 9, 'zamkniety', 3, '2025-10-05 16:00:00+02', NULL, 'Okres wrzesień zamknięty bez uwag.'),
    (2, 2025, 10, 'zamkniety', 3, '2025-11-05 14:30:00+01', NULL, 'Rozliczenie października zamknięte po inwentaryzacji. Wszystkie raporty zatwierdzone.'),
    (3, 2025, 11, 'oczekuje_na_zamkniecie', NULL, NULL, NULL, 'Czekamy na zatwierdzenie raportów z eventów świątecznych. Planowane zamknięcie 05.12.'),
    (4, 2025, 12, 'otwarty', NULL, NULL, NULL, 'Okres grudzień otwarty. Zwiększone obłożenie eventami świątecznymi.');

-- ============================================================================
-- DOSTĘPNOŚĆ PRACOWNIKÓW (120 wpisów - różne godziny, ograniczenia)
-- ============================================================================
INSERT INTO public.availability (user_id, date, is_available, time_from, time_to, created_at)
VALUES
    -- LISTOPAD 2025 - różne dostępności
    (16, '2025-11-01', true, '06:00', '14:00', '2025-10-25 08:00:00'),
    (17, '2025-11-01', true, '05:00', '13:00', '2025-10-25 07:30:00'),
    (18, '2025-11-01', true, '07:00', '15:00', '2025-10-25 08:15:00'),
    (13, '2025-11-02', true, '04:00', '12:00', '2025-10-26 06:00:00'),
    (14, '2025-11-02', true, '05:00', '13:00', '2025-10-26 06:30:00'),
    (19, '2025-11-03', false, NULL, NULL, '2025-10-28 09:00:00'), -- nieobecność
    (20, '2025-11-03', true, '10:00', '18:00', '2025-10-28 08:30:00'),
    (6, '2025-11-04', true, '06:00', '14:00', '2025-10-30 07:30:00'),
    (7, '2025-11-04', true, '14:00', '22:00', '2025-10-30 07:00:00'),
    (9, '2025-11-05', true, '06:00', '14:00', '2025-10-31 06:30:00'),
    (10, '2025-11-05', true, '14:00', '22:00', '2025-10-31 07:15:00'),
    (11, '2025-11-06', true, '06:00', '12:00', '2025-11-01 06:45:00'),
    (12, '2025-11-06', true, '12:00', '20:00', '2025-11-01 07:30:00'),
    (16, '2025-11-07', true, '05:00', '13:00', '2025-11-02 07:20:00'),
    (17, '2025-11-07', true, '13:00', '21:00', '2025-11-02 05:30:00'),
    (13, '2025-11-08', true, '03:00', '11:00', '2025-11-03 08:10:00'),
    (15, '2025-11-08', true, '04:00', '12:00', '2025-11-03 07:45:00'),
    (19, '2025-11-09', true, '15:00', '23:00', '2025-11-04 09:05:00'),
    (21, '2025-11-09', true, '15:00', '23:00', '2025-11-04 09:00:00'),
    (6, '2025-11-10', true, '05:00', '13:00', '2025-11-05 07:30:00'),
    (8, '2025-11-10', true, '13:00', '21:00', '2025-11-05 07:00:00'),
    (23, '2025-11-11', false, NULL, NULL, '2025-11-06 07:00:00'), -- święto/urlop
    (24, '2025-11-11', false, NULL, NULL, '2025-11-06 06:30:00'),
    (16, '2025-11-12', true, '06:00', '14:00', '2025-11-07 07:20:00'),
    (17, '2025-11-12', true, '06:00', '14:00', '2025-11-07 05:30:00'),
    (18, '2025-11-12', true, '06:00', '14:00', '2025-11-07 06:15:00'),
    (9, '2025-11-13', true, '06:00', '14:00', '2025-11-08 06:30:00'),
    (10, '2025-11-13', true, '06:00', '14:00', '2025-11-08 07:15:00'),
    (11, '2025-11-13', true, '06:00', '14:00', '2025-11-08 06:45:00'),
    (19, '2025-11-14', true, '16:00', '00:00', '2025-11-09 09:05:00'),
    (20, '2025-11-14', true, '16:00', '00:00', '2025-11-09 08:30:00'),
    (22, '2025-11-14', true, '16:00', '00:00', '2025-11-09 08:45:00'),
    (13, '2025-11-15', true, '03:00', '11:00', '2025-11-10 08:10:00'),
    (14, '2025-11-15', true, '03:00', '11:00', '2025-11-10 06:00:00'),
    (15, '2025-11-15', true, '04:00', '12:00', '2025-11-10 07:45:00'),
    (7, '2025-11-16', true, '06:00', '14:00', '2025-11-11 06:00:00'),
    (8, '2025-11-16', true, '14:00', '22:00', '2025-11-11 07:00:00'),
    (12, '2025-11-16', true, '06:00', '14:00', '2025-11-11 07:30:00'),
    (16, '2025-11-17', true, '05:00', '13:00', '2025-11-12 07:20:00'),
    (17, '2025-11-17', true, '13:00', '21:00', '2025-11-12 05:30:00'),
    (18, '2025-11-17', true, '05:00', '13:00', '2025-11-12 06:15:00'),
    (6, '2025-11-18', true, '06:00', '14:00', '2025-11-13 07:30:00'),
    (9, '2025-11-18', true, '06:00', '14:00', '2025-11-13 06:30:00'),
    (10, '2025-11-18', true, '14:00', '22:00', '2025-11-13 07:15:00'),
    (19, '2025-11-19', true, '17:00', '01:00', '2025-11-14 09:05:00'),
    (21, '2025-11-19', true, '17:00', '01:00', '2025-11-14 09:00:00'),
    (22, '2025-11-19', true, '17:00', '01:00', '2025-11-14 08:45:00'),
    (16, '2025-11-20', true, '06:00', '14:00', '2025-11-15 07:20:00'),
    (17, '2025-11-20', true, '06:00', '14:00', '2025-11-15 05:30:00'),
    (13, '2025-11-21', true, '03:00', '11:00', '2025-11-16 08:10:00'),
    (14, '2025-11-21', true, '03:00', '11:00', '2025-11-16 06:00:00'),
    (15, '2025-11-21', true, '03:00', '11:00', '2025-11-16 07:45:00'),
    (7, '2025-11-22', false, NULL, NULL, '2025-11-17 06:00:00'), -- urlop sobota
    (11, '2025-11-22', true, '08:00', '16:00', '2025-11-17 06:45:00'),
    (20, '2025-11-22', true, '10:00', '18:00', '2025-11-17 08:30:00'),
    (8, '2025-11-23', true, '10:00', '18:00', '2025-11-18 07:00:00'),
    (10, '2025-11-23', true, '10:00', '18:00', '2025-11-18 07:15:00'),
    (21, '2025-11-23', true, '12:00', '20:00', '2025-11-18 09:00:00'),
    (6, '2025-11-24', true, '06:00', '14:00', '2025-11-19 07:30:00'),
    (9, '2025-11-24', true, '06:00', '14:00', '2025-11-19 06:30:00'),
    (11, '2025-11-24', true, '06:00', '14:00', '2025-11-19 06:45:00'),
    (16, '2025-11-25', true, '05:00', '13:00', '2025-11-20 07:20:00'),
    (17, '2025-11-25', true, '05:00', '13:00', '2025-11-20 05:30:00'),
    (18, '2025-11-25', true, '07:00', '15:00', '2025-11-20 06:15:00'),
    (13, '2025-11-26', true, '04:00', '12:00', '2025-11-21 08:10:00'),
    (14, '2025-11-26', true, '04:00', '12:00', '2025-11-21 06:00:00'),
    (19, '2025-11-27', true, '15:00', '23:00', '2025-11-22 09:05:00'),
    (20, '2025-11-27', true, '15:00', '23:00', '2025-11-22 08:30:00'),
    (21, '2025-11-27', true, '15:00', '23:00', '2025-11-22 09:00:00'),
    (7, '2025-11-28', true, '08:00', '16:00', '2025-11-23 06:00:00'),
    (12, '2025-11-28', true, '06:00', '14:00', '2025-11-23 07:30:00'),
    (6, '2025-11-29', true, '06:00', '14:00', '2025-11-24 07:30:00'),
    (8, '2025-11-29', true, '14:00', '22:00', '2025-11-24 07:00:00'),
    (16, '2025-11-30', true, '06:00', '14:00', '2025-11-25 07:20:00'),
    (17, '2025-11-30', true, '14:00', '22:00', '2025-11-25 05:30:00'),
    
    -- GRUDZIEŃ 2025 - sezon świąteczny
    (6, '2025-12-01', true, '06:00', '14:00', '2025-11-26 07:30:00'),
    (7, '2025-12-01', true, '06:00', '14:00', '2025-11-26 06:00:00'),
    (8, '2025-12-01', true, '14:00', '22:00', '2025-11-26 07:00:00'),
    (9, '2025-12-02', true, '06:00', '14:00', '2025-11-27 06:30:00'),
    (10, '2025-12-02', true, '06:00', '14:00', '2025-11-27 07:15:00'),
    (11, '2025-12-02', true, '06:00', '14:00', '2025-11-27 06:45:00'),
    (12, '2025-12-02', true, '14:00', '22:00', '2025-11-27 07:30:00'),
    (13, '2025-12-03', true, '03:00', '11:00', '2025-11-28 08:10:00'),
    (14, '2025-12-03', true, '03:00', '11:00', '2025-11-28 06:00:00'),
    (15, '2025-12-03', true, '04:00', '12:00', '2025-11-28 07:45:00'),
    (16, '2025-12-04', true, '05:00', '13:00', '2025-11-29 07:20:00'),
    (17, '2025-12-04', true, '05:00', '13:00', '2025-11-29 05:30:00'),
    (18, '2025-12-04', true, '06:00', '14:00', '2025-11-29 06:15:00'),
    (19, '2025-12-05', true, '13:00', '21:00', '2025-11-30 09:05:00'),
    (20, '2025-12-05', true, '13:00', '21:00', '2025-11-30 08:30:00'),
    (21, '2025-12-05', true, '14:00', '22:00', '2025-11-30 09:00:00'),
    (22, '2025-12-05', true, '14:00', '22:00', '2025-11-30 08:45:00'),
    (6, '2025-12-06', true, '06:00', '14:00', '2025-12-01 07:30:00'),
    (7, '2025-12-06', true, '14:00', '22:00', '2025-12-01 06:00:00'),
    (8, '2025-12-06', true, '06:00', '14:00', '2025-12-01 07:00:00'),
    (10, '2025-12-07', true, '10:00', '18:00', '2025-12-02 07:15:00'),
    (21, '2025-12-07', true, '12:00', '20:00', '2025-12-02 09:00:00'),
    (13, '2025-12-08', true, '03:00', '11:00', '2025-12-03 08:10:00'),
    (14, '2025-12-08', true, '03:00', '11:00', '2025-12-03 06:00:00'),
    (15, '2025-12-08', true, '03:00', '11:00', '2025-12-03 07:45:00'),
    (16, '2025-12-09', true, '06:00', '14:00', '2025-12-04 07:20:00'),
    (17, '2025-12-09', true, '06:00', '14:00', '2025-12-04 05:30:00'),
    (6, '2025-12-10', true, '06:00', '14:00', '2025-12-05 07:30:00'),
    (9, '2025-12-10', true, '06:00', '14:00', '2025-12-05 06:30:00'),
    (11, '2025-12-10', true, '06:00', '14:00', '2025-12-05 06:45:00'),
    (19, '2025-12-11', true, '16:00', '00:00', '2025-12-06 09:05:00'),
    (20, '2025-12-11', true, '16:00', '00:00', '2025-12-06 08:30:00'),
    (22, '2025-12-11', true, '16:00', '00:00', '2025-12-06 08:45:00'),
    (7, '2025-12-12', true, '06:00', '14:00', '2025-12-07 06:00:00'),
    (8, '2025-12-12', true, '14:00', '22:00', '2025-12-07 07:00:00'),
    (12, '2025-12-12', true, '14:00', '22:00', '2025-12-07 07:30:00'),
    (16, '2025-12-13', true, '05:00', '13:00', '2025-12-08 07:20:00'),
    (17, '2025-12-13', true, '05:00', '13:00', '2025-12-08 05:30:00'),
    (18, '2025-12-13', true, '07:00', '15:00', '2025-12-08 06:15:00'),
    (13, '2025-12-14', true, '04:00', '12:00', '2025-12-09 08:10:00'),
    (14, '2025-12-14', true, '04:00', '12:00', '2025-12-09 06:00:00'),
    (15, '2025-12-14', true, '04:00', '12:00', '2025-12-09 07:45:00'),
    (6, '2025-12-15', true, '06:00', '14:00', '2025-12-10 07:30:00'),
    (9, '2025-12-15', true, '06:00', '14:00', '2025-12-10 06:30:00'),
    (10, '2025-12-15', true, '14:00', '22:00', '2025-12-10 07:15:00');

-- ============================================================================
-- NIEOBECNOŚCI I URLOPY (40 wpisów - różne typy i statusy)
-- ============================================================================
INSERT INTO public.absences (absence_id, user_id, absence_type, date_from, date_to, created_at, status, submitted_at, approved_at, rejected_at, reviewed_by_user_id, reviewer_comment)
VALUES
    -- URLOPY ZAAKCEPTOWANE
    (1, 13, 'urlop', '2025-12-24', '2025-12-27', '2025-11-29 11:00:00', 'zaakceptowany', '2025-11-29 11:05:00+01', '2025-11-30 09:15:00+01', NULL, 3, 'Urlop świąteczny zatwierdzony, cukiernia zabezpieczona.'),
    (2, 14, 'urlop', '2025-12-26', '2025-12-29', '2025-11-30 10:00:00', 'zaakceptowany', '2025-11-30 10:05:00+01', '2025-12-01 08:30:00+01', NULL, 3, 'Zatwierdzono, Robert zastępuje Ewę.'),
    (3, 9, 'urlop', '2025-12-30', '2026-01-02', '2025-12-01 08:00:00', 'zaakceptowany', '2025-12-01 08:05:00+01', '2025-12-02 09:00:00+01', NULL, 4, 'Urlop po Nowym Roku - OK.'),
    (4, 16, 'urlop', '2025-11-08', '2025-11-10', '2025-10-28 09:00:00', 'zaakceptowany', '2025-10-28 09:05:00+02', '2025-10-29 10:00:00+02', NULL, 3, 'Zastępstwo Krzysztofa i Łukasza - zatwierdzono.'),
    (5, 21, 'urlop', '2025-11-15', '2025-11-17', '2025-11-01 10:30:00', 'zaakceptowany', '2025-11-01 10:35:00+01', '2025-11-02 08:45:00+01', NULL, 4, 'Urlop krótki - zaakceptowany.'),
    (6, 23, 'urlop', '2025-12-20', '2025-12-23', '2025-12-05 08:00:00', 'zaakceptowany', '2025-12-05 08:05:00+01', '2025-12-06 09:30:00+01', NULL, 3, 'Urlop przedświąteczny - magazyn pod kontrolą Grzegorza.'),
    (7, 10, 'urlop', '2025-11-22', '2025-11-24', '2025-11-08 09:00:00', 'zaakceptowany', '2025-11-08 09:05:00+01', '2025-11-09 10:00:00+01', NULL, 4, 'Weekend przedłużony - OK.'),
    (8, 18, 'urlop', '2025-12-28', '2026-01-03', '2025-12-10 07:30:00', 'zaakceptowany', '2025-12-10 07:35:00+01', '2025-12-11 08:00:00+01', NULL, 3, 'Urlop świąteczny - flota zabezpieczona.'),
    (9, 12, 'urlop', '2025-11-04', '2025-11-06', '2025-10-25 10:00:00', 'zaakceptowany', '2025-10-25 10:05:00+02', '2025-10-26 09:00:00+02', NULL, 4, 'Urlop długi weekend - akceptacja.'),
    (10, 25, 'urlop', '2025-12-16', '2025-12-18', '2025-12-02 09:00:00', 'zaakceptowany', '2025-12-02 09:05:00+01', '2025-12-03 10:00:00+01', NULL, 3, 'Urlop - Barbara i Grzegorz pokryją grafik.'),
    
    -- URLOPY OCZEKUJĄCE
    (11, 11, 'urlop', '2025-12-19', '2025-12-22', '2025-12-10 08:00:00', 'oczekuje_na_akceptacje', '2025-12-10 08:05:00+01', NULL, NULL, NULL, NULL),
    (12, 15, 'urlop', '2025-12-23', '2025-12-26', '2025-12-11 09:30:00', 'oczekuje_na_akceptacje', '2025-12-11 09:35:00+01', NULL, NULL, NULL, NULL),
    (13, 17, 'urlop', '2026-01-04', '2026-01-06', '2025-12-12 07:00:00', 'oczekuje_na_akceptacje', '2025-12-12 07:05:00+01', NULL, NULL, NULL, NULL),
    (14, 22, 'urlop', '2025-12-14', '2025-12-15', '2025-12-05 10:00:00', 'oczekuje_na_akceptacje', '2025-12-05 10:05:00+01', NULL, NULL, NULL, NULL),
    
    -- URLOPY ODRZUCONE
    (15, 19, 'urlop', '2025-11-10', '2025-11-11', '2025-11-03 15:00:00', 'odrzucony', '2025-11-03 15:05:00+01', NULL, '2025-11-04 10:20:00+01', 3, 'Odrzucono - bankiet TechWave wymaga pełnego składu obsługi.'),
    (16, 7, 'urlop', '2025-12-05', '2025-12-07', '2025-11-20 08:00:00', 'odrzucony', '2025-11-20 08:05:00+01', NULL, '2025-11-21 09:00:00+01', 4, 'Szczytowy okres eventów - brak możliwości zwolnienia szefa kuchni.'),
    (17, 6, 'urlop', '2025-12-13', '2025-12-15', '2025-11-28 09:30:00', 'odrzucony', '2025-11-28 09:35:00+01', NULL, '2025-11-29 10:00:00+01', 3, 'Degustacja menu i inwentaryzacja - potrzebujemy Celiny.'),
    (18, 20, 'urlop', '2025-11-28', '2025-11-30', '2025-11-15 11:00:00', 'odrzucony', '2025-11-15 11:05:00+01', NULL, '2025-11-16 09:30:00+01', 4, 'Koniec miesiąca, duże eventy - brak zastępstwa.'),
    
    -- ZWOLNIENIA LEKARSKIE (L4) - ZAAKCEPTOWANE
    (19, 10, 'L4', '2025-11-05', '2025-11-07', '2025-11-05 07:00:00', 'zaakceptowany', '2025-11-05 07:05:00+01', '2025-11-05 08:00:00+01', NULL, 3, 'L4 potwierdzone. Wyzdrowień!'),
    (20, 15, 'L4', '2025-11-12', '2025-11-14', '2025-11-12 06:30:00', 'zaakceptowany', '2025-11-12 06:35:00+01', '2025-11-12 08:00:00+01', NULL, 4, 'Zwolnienie zaakceptowane automatycznie.'),
    (21, 22, 'L4', '2025-11-18', '2025-11-20', '2025-11-18 08:00:00', 'zaakceptowany', '2025-11-18 08:05:00+01', '2025-11-18 09:00:00+01', NULL, 3, 'L4 - obsługa pokryta przez Gabrielę i Joannę.'),
    (22, 24, 'L4', '2025-12-02', '2025-12-05', '2025-12-02 07:00:00', 'zaakceptowany', '2025-12-02 07:05:00+01', '2025-12-02 08:30:00+01', NULL, 4, 'Zwolnienie - Barbara przejmuje obowiązki.'),
    (23, 9, 'L4', '2025-11-25', '2025-11-26', '2025-11-25 06:00:00', 'zaakceptowany', '2025-11-25 06:05:00+01', '2025-11-25 07:00:00+01', NULL, 3, 'Krótkie L4 - zaakceptowane.'),
    
    -- INNE NIEOBECNOŚCI - RÓŻNE STATUSY
    (24, 8, 'inne', '2025-11-14', '2025-11-14', '2025-11-13 15:00:00', 'zaakceptowany', '2025-11-13 15:05:00+01', '2025-11-14 08:00:00+01', NULL, 4, 'Opieka nad dzieckiem - zaakceptowano jednorazowo.'),
    (25, 16, 'inne', '2025-11-21', '2025-11-21', '2025-11-20 16:00:00', 'zaakceptowany', '2025-11-20 16:05:00+01', '2025-11-21 07:00:00+01', NULL, 3, 'Wizyta lekarska - OK, Krzysztof pokrywa dostawy.'),
    (26, 11, 'inne', '2025-12-09', '2025-12-09', '2025-12-08 14:00:00', 'zaakceptowany', '2025-12-08 14:05:00+01', '2025-12-09 07:30:00+01', NULL, 4, 'Sprawy urzędowe - półdnia wolne.'),
    (27, 23, 'inne', '2025-11-27', '2025-11-27', '2025-11-26 17:00:00', 'oczekuje_na_akceptacje', '2025-11-26 17:05:00+01', NULL, NULL, NULL, NULL),
    (28, 19, 'inne', '2025-12-08', '2025-12-08', '2025-12-07 15:30:00', 'oczekuje_na_akceptacje', '2025-12-07 15:35:00+01', NULL, NULL, NULL, NULL),
    (29, 14, 'inne', '2025-11-30', '2025-11-30', '2025-11-29 14:00:00', 'odrzucony', '2025-11-29 14:05:00+01', NULL, '2025-11-30 07:00:00+01', 3, 'Brak uzasadnienia - odrzucono.'),
    
    -- ROBOCZE (draft) - niewysłane
    (30, 12, 'urlop', '2026-01-10', '2026-01-12', '2025-12-13 20:00:00', 'roboczy', NULL, NULL, NULL, NULL, NULL),
    (31, 17, 'inne', '2025-12-17', '2025-12-17', '2025-12-15 19:00:00', 'roboczy', NULL, NULL, NULL, NULL, NULL),
    (32, 21, 'urlop', '2026-01-08', '2026-01-10', '2025-12-14 18:30:00', 'roboczy', NULL, NULL, NULL, NULL, NULL),
    
    -- DODATKOWE URLOPY ZAAKCEPTOWANE (grudzień/styczeń)
    (33, 8, 'urlop', '2026-01-05', '2026-01-09', '2025-12-08 10:00:00', 'zaakceptowany', '2025-12-08 10:05:00+01', '2025-12-09 09:00:00+01', NULL, 3, 'Urlop po Nowym Roku - zespół restauracji OK.'),
    (34, 19, 'urlop', '2026-01-02', '2026-01-04', '2025-12-06 11:00:00', 'zaakceptowany', '2025-12-06 11:05:00+01', '2025-12-07 08:30:00+01', NULL, 4, 'Krótki urlop noworoczny - akceptacja.'),
    (35, 20, 'urlop', '2025-12-21', '2025-12-23', '2025-12-10 09:30:00', 'oczekuje_na_akceptacje', '2025-12-10 09:35:00+01', NULL, NULL, NULL, NULL),
    
    -- L4 DODATKOWE
    (36, 6, 'L4', '2025-11-29', '2025-11-30', '2025-11-29 06:00:00', 'zaakceptowany', '2025-11-29 06:05:00+01', '2025-11-29 07:30:00+01', NULL, 3, 'Zwolnienie krótkie - Damian przejmuje Mokotów.'),
    (37, 18, 'L4', '2025-11-16', '2025-11-17', '2025-11-16 05:30:00', 'zaakceptowany', '2025-11-16 05:35:00+01', '2025-11-16 07:00:00+01', NULL, 4, 'L4 - transport pokryty przez Filipa i Krzysztofa.'),
    
    -- ODRZUCONE INNE
    (38, 13, 'inne', '2025-12-12', '2025-12-13', '2025-12-10 16:00:00', 'odrzucony', '2025-12-10 16:05:00+01', NULL, '2025-12-11 08:00:00+01', 3, 'Szczyt produkcji deserów - brak możliwości zwolnienia.'),
    (39, 7, 'inne', '2025-11-26', '2025-11-26', '2025-11-25 17:00:00', 'odrzucony', '2025-11-25 17:05:00+01', NULL, '2025-11-26 07:00:00+01', 4, 'Event wieczorny - potrzebujemy szefa kuchni.'),
    
    -- OCZEKUJĄCE DODATKOWE
    (40, 24, 'urlop', '2025-12-27', '2025-12-29', '2025-12-15 10:00:00', 'oczekuje_na_akceptacje', '2025-12-15 10:05:00+01', NULL, NULL, NULL, NULL);

-- Rejestr decyzji akceptacyjnych
INSERT INTO public.approval_log (approval_log_id, entity_type, entity_id, action, actor_user_id, comment, created_at)
VALUES
    (1, 'absence', 1, 'approved', 2, 'Potwierdzam urlop Ewy po uzgodnieniu z Celiną.', '2025-11-30 09:16:00+01'),
    (2, 'absence', 2, 'rejected', 2, 'Brak możliwości zwolnienia Gabrieli w szczycie sezonu.', '2025-11-04 10:21:00+01');

-- Rozszerzony harmonogram zmian (fragment 1: ~140 wpisów listopad–grudzień)
INSERT INTO public.schedule (schedule_id, user_id, project_id, work_date, time_from, time_to, shift_type, created_by_user_id, created_at)
VALUES
    -- Projekt 1 Mokotów: Celina (6), Jakub (9), Natalia (10), Paweł (11)
    (1, 6, 1, '2025-11-03', '06:00', '14:00', 'normalna', 1, '2025-10-28 07:00:00'),
    (2, 9, 1, '2025-11-03', '06:00', '14:00', 'normalna', 6, '2025-10-28 07:10:00'),
    (3, 10, 1, '2025-11-03', '14:00', '22:00', 'normalna', 6, '2025-10-28 07:15:00'),
    (4, 11, 1, '2025-11-03', '08:00', '16:00', 'normalna', 6, '2025-10-28 07:20:00'),
    (5, 6, 1, '2025-11-04', '06:00', '14:00', 'normalna', 1, '2025-10-28 07:00:00'),
    (6, 9, 1, '2025-11-04', '06:00', '14:00', 'normalna', 6, '2025-10-28 07:10:00'),
    (7, 10, 1, '2025-11-04', '14:00', '22:00', 'normalna', 6, '2025-10-28 07:15:00'),
    (8, 11, 1, '2025-11-04', '08:00', '16:00', 'normalna', 6, '2025-10-28 07:20:00'),
    (9, 6, 1, '2025-11-05', '06:00', '14:00', 'normalna', 1, '2025-10-29 07:00:00'),
    (10, 9, 1, '2025-11-05', '06:00', '14:00', 'normalna', 6, '2025-10-29 07:10:00'),
    (11, 10, 1, '2025-11-05', '14:00', '22:00', 'normalna', 6, '2025-10-29 07:15:00'),
    (12, 11, 1, '2025-11-05', '08:00', '16:00', 'normalna', 6, '2025-10-29 07:20:00'),
    -- Weekend przerzedzony
    (13, 6, 1, '2025-11-07', '06:00', '14:00', 'normalna', 1, '2025-10-30 07:00:00'),
    (14, 9, 1, '2025-11-07', '06:00', '14:00', 'normalna', 6, '2025-10-30 07:10:00'),
    (15, 10, 1, '2025-11-07', '14:00', '22:00', 'normalna', 6, '2025-10-30 07:15:00'),
    (16, 11, 1, '2025-11-07', '08:00', '16:00', 'normalna', 6, '2025-10-30 07:20:00'),
    (17, 6, 1, '2025-11-10', '06:00', '14:00', 'normalna', 1, '2025-11-02 07:00:00'),
    (18, 9, 1, '2025-11-10', '06:00', '14:00', 'normalna', 6, '2025-11-02 07:10:00'),
    (19, 10, 1, '2025-11-10', '14:00', '22:00', 'normalna', 6, '2025-11-02 07:15:00'),
    (20, 11, 1, '2025-11-10', '08:00', '16:00', 'normalna', 6, '2025-11-02 07:20:00'),
    -- Rotacja dnia wolnego (Jakub wolne 11.11)
    (21, 6, 1, '2025-11-11', '06:00', '14:00', 'normalna', 1, '2025-11-03 07:00:00'),
    (22, 10, 1, '2025-11-11', '14:00', '22:00', 'normalna', 6, '2025-11-03 07:15:00'),
    (23, 11, 1, '2025-11-11', '08:00', '16:00', 'normalna', 6, '2025-11-03 07:20:00'),
    (24, 9, 1, '2025-11-12', '06:00', '14:00', 'normalna', 6, '2025-11-04 07:10:00'),
    (25, 6, 1, '2025-11-12', '06:00', '14:00', 'normalna', 1, '2025-11-04 07:00:00'),
    (26, 10, 1, '2025-11-12', '14:00', '22:00', 'normalna', 6, '2025-11-04 07:15:00'),
    (27, 11, 1, '2025-11-12', '08:00', '16:00', 'normalna', 6, '2025-11-04 07:20:00'),
    (28, 6, 1, '2025-11-13', '06:00', '14:00', 'normalna', 1, '2025-11-05 07:00:00'),
    (29, 9, 1, '2025-11-13', '06:00', '14:00', 'normalna', 6, '2025-11-05 07:10:00'),
    (30, 10, 1, '2025-11-13', '14:00', '22:00', 'normalna', 6, '2025-11-05 07:15:00'),
    (31, 11, 1, '2025-11-13', '08:00', '16:00', 'normalna', 6, '2025-11-05 07:20:00'),
    -- Projekt 2 Śródmieście: Damian (7), Karolina (8), Magdalena (12)
    (32, 7, 2, '2025-11-03', '12:00', '20:00', 'normalna', 1, '2025-10-28 10:00:00'),
    (33, 8, 2, '2025-11-03', '08:00', '16:00', 'normalna', 1, '2025-10-28 10:05:00'),
    (34, 12, 2, '2025-11-03', '10:00', '18:00', 'normalna', 8, '2025-10-28 10:10:00'),
    (35, 7, 2, '2025-11-04', '12:00', '20:00', 'normalna', 1, '2025-10-28 10:00:00'),
    (36, 8, 2, '2025-11-04', '08:00', '16:00', 'normalna', 1, '2025-10-28 10:05:00'),
    (37, 12, 2, '2025-11-04', '10:00', '18:00', 'normalna', 8, '2025-10-28 10:10:00'),
    (38, 7, 2, '2025-11-05', '12:00', '20:00', 'normalna', 1, '2025-10-29 10:00:00'),
    (39, 8, 2, '2025-11-05', '08:00', '16:00', 'normalna', 1, '2025-10-29 10:05:00'),
    (40, 12, 2, '2025-11-05', '10:00', '18:00', 'normalna', 8, '2025-10-29 10:10:00'),
    (41, 7, 2, '2025-11-06', '12:00', '20:00', 'normalna', 1, '2025-10-30 10:00:00'),
    (42, 8, 2, '2025-11-06', '08:00', '16:00', 'normalna', 1, '2025-10-30 10:05:00'),
    (43, 12, 2, '2025-11-06', '10:00', '18:00', 'normalna', 8, '2025-10-30 10:10:00'),
    -- Projekt 4 TechWave: produkcja + logistyka (Celina 6 też w 4, Filip 16, Krzysztof 17)
    (44, 6, 4, '2025-11-03', '05:30', '13:30', 'normalna', 1, '2025-10-28 09:00:00'),
    (45, 16, 4, '2025-11-03', '06:00', '14:00', 'normalna', 6, '2025-10-28 09:10:00'),
    (46, 17, 4, '2025-11-03', '05:00', '13:00', 'normalna', 6, '2025-10-28 09:15:00'),
    (47, 6, 4, '2025-11-04', '05:30', '13:30', 'normalna', 1, '2025-10-28 09:00:00'),
    (48, 16, 4, '2025-11-04', '06:00', '14:00', 'normalna', 6, '2025-10-28 09:10:00'),
    (49, 17, 4, '2025-11-04', '05:00', '13:00', 'normalna', 6, '2025-10-28 09:15:00'),
    (50, 6, 4, '2025-11-05', '05:30', '13:30', 'normalna', 1, '2025-10-29 09:00:00'),
    (51, 16, 4, '2025-11-05', '06:00', '14:00', 'normalna', 6, '2025-10-29 09:10:00'),
    (52, 17, 4, '2025-11-05', '05:00', '13:00', 'normalna', 6, '2025-10-29 09:15:00'),
    -- Projekt 7 Eventy świąteczne (przygotowania ruszają 15.11)
    (53, 7, 7, '2025-11-15', '10:00', '18:00', 'normalna', 2, '2025-11-05 12:00:00'),
    (54, 8, 7, '2025-11-15', '10:00', '18:00', 'normalna', 2, '2025-11-05 12:05:00'),
    (55, 9, 7, '2025-11-15', '08:00', '16:00', 'normalna', 2, '2025-11-05 12:10:00'),
    (56, 10, 7, '2025-11-15', '12:00', '20:00', 'normalna', 2, '2025-11-05 12:15:00'),
    (57, 11, 7, '2025-11-15', '06:00', '14:00', 'normalna', 2, '2025-11-05 12:20:00'),
    (58, 16, 7, '2025-11-15', '05:00', '13:00', 'normalna', 2, '2025-11-05 12:25:00'),
    (59, 17, 7, '2025-11-15', '05:00', '13:00', 'normalna', 2, '2025-11-05 12:30:00'),
    -- Powtórzenia przygotowań kolejnych dni (skrót)
    (60, 7, 7, '2025-11-16', '10:00', '18:00', 'normalna', 2, '2025-11-06 12:00:00'),
    (61, 8, 7, '2025-11-16', '10:00', '18:00', 'normalna', 2, '2025-11-06 12:05:00'),
    (62, 9, 7, '2025-11-16', '08:00', '16:00', 'normalna', 2, '2025-11-06 12:10:00'),
    (63, 10, 7, '2025-11-16', '12:00', '20:00', 'normalna', 2, '2025-11-06 12:15:00'),
    (64, 11, 7, '2025-11-16', '06:00', '14:00', 'normalna', 2, '2025-11-06 12:20:00'),
    (65, 16, 7, '2025-11-16', '05:00', '13:00', 'normalna', 2, '2025-11-06 12:25:00'),
    (66, 17, 7, '2025-11-16', '05:00', '13:00', 'normalna', 2, '2025-11-06 12:30:00'),
    -- Projekt 10 Ciastkarnia (Ewa 13, Robert 14, Anna 15)
    (67, 13, 10, '2025-11-03', '04:00', '12:00', 'normalna', 1, '2025-10-28 05:00:00'),
    (68, 14, 10, '2025-11-03', '05:00', '13:00', 'normalna', 1, '2025-10-28 05:05:00'),
    (69, 15, 10, '2025-11-03', '06:00', '14:00', 'normalna', 1, '2025-10-28 05:10:00'),
    (70, 13, 10, '2025-11-04', '04:00', '12:00', 'normalna', 1, '2025-10-28 05:00:00'),
    (71, 14, 10, '2025-11-04', '05:00', '13:00', 'normalna', 1, '2025-10-28 05:05:00'),
    (72, 15, 10, '2025-11-04', '06:00', '14:00', 'normalna', 1, '2025-10-28 05:10:00'),
    (73, 13, 10, '2025-11-05', '04:00', '12:00', 'normalna', 1, '2025-10-29 05:00:00'),
    (74, 14, 10, '2025-11-05', '05:00', '13:00', 'normalna', 1, '2025-10-29 05:05:00'),
    (75, 15, 10, '2025-11-05', '06:00', '14:00', 'normalna', 1, '2025-10-29 05:10:00'),
    -- Projekt 11 Logistyka (Filip 16, Krzysztof 17, Łukasz 18)
    (76, 16, 11, '2025-11-03', '06:00', '14:00', 'normalna', 1, '2025-10-28 06:30:00'),
    (77, 17, 11, '2025-11-03', '05:30', '13:30', 'normalna', 1, '2025-10-28 06:35:00'),
    (78, 18, 11, '2025-11-03', '06:15', '14:15', 'normalna', 1, '2025-10-28 06:40:00'),
    (79, 16, 11, '2025-11-04', '06:00', '14:00', 'normalna', 1, '2025-10-28 06:30:00'),
    (80, 17, 11, '2025-11-04', '05:30', '13:30', 'normalna', 1, '2025-10-28 06:35:00'),
    (81, 18, 11, '2025-11-04', '06:15', '14:15', 'normalna', 1, '2025-10-28 06:40:00'),
    (82, 16, 11, '2025-11-05', '06:00', '14:00', 'normalna', 1, '2025-10-29 06:30:00'),
    (83, 17, 11, '2025-11-05', '05:30', '13:30', 'normalna', 1, '2025-10-29 06:35:00'),
    (84, 18, 11, '2025-11-05', '06:15', '14:15', 'normalna', 1, '2025-10-29 06:40:00'),
    -- Projekt 12 Magazyn (Barbara 23, Grzegorz 24, Dorota 25)
    (85, 23, 12, '2025-11-03', '06:00', '14:00', 'normalna', 2, '2025-10-28 08:00:00'),
    (86, 24, 12, '2025-11-03', '06:30', '14:30', 'normalna', 2, '2025-10-28 08:05:00'),
    (87, 25, 12, '2025-11-03', '07:00', '15:00', 'normalna', 2, '2025-10-28 08:10:00'),
    (88, 23, 12, '2025-11-04', '06:00', '14:00', 'normalna', 2, '2025-10-28 08:00:00'),
    (89, 24, 12, '2025-11-04', '06:30', '14:30', 'normalna', 2, '2025-10-28 08:05:00'),
    (90, 25, 12, '2025-11-04', '07:00', '15:00', 'normalna', 2, '2025-10-28 08:10:00'),
    -- Wybrane dni grudniowe (start sezonu)
    (91, 6, 1, '2025-12-02', '06:00', '14:00', 'normalna', 1, '2025-11-24 07:00:00'),
    (92, 9, 1, '2025-12-02', '06:00', '14:00', 'normalna', 6, '2025-11-24 07:10:00'),
    (93, 10, 1, '2025-12-02', '14:00', '22:00', 'normalna', 6, '2025-11-24 07:15:00'),
    (94, 11, 1, '2025-12-02', '08:00', '16:00', 'normalna', 6, '2025-11-24 07:20:00'),
    (95, 7, 2, '2025-12-02', '12:00', '20:00', 'normalna', 1, '2025-11-24 10:00:00'),
    (96, 8, 2, '2025-12-02', '08:00', '16:00', 'normalna', 1, '2025-11-24 10:05:00'),
    (97, 12, 2, '2025-12-02', '10:00', '18:00', 'normalna', 8, '2025-11-24 10:10:00'),
    (98, 6, 4, '2025-12-02', '05:30', '13:30', 'normalna', 1, '2025-11-24 09:00:00'),
    (99, 16, 4, '2025-12-02', '06:00', '14:00', 'normalna', 6, '2025-11-24 09:10:00'),
    (100, 17, 4, '2025-12-02', '05:00', '13:00', 'normalna', 6, '2025-11-24 09:15:00'),
    (101, 13, 10, '2025-12-02', '04:00', '12:00', 'normalna', 1, '2025-11-24 05:00:00'),
    (102, 14, 10, '2025-12-02', '05:00', '13:00', 'normalna', 1, '2025-11-24 05:05:00'),
    (103, 15, 10, '2025-12-02', '06:00', '14:00', 'normalna', 1, '2025-11-24 05:10:00'),
    (104, 23, 12, '2025-12-02', '06:00', '14:00', 'normalna', 2, '2025-11-24 08:00:00'),
    (105, 24, 12, '2025-12-02', '06:30', '14:30', 'normalna', 2, '2025-11-24 08:05:00'),
    (106, 25, 12, '2025-12-02', '07:00', '15:00', 'normalna', 2, '2025-11-24 08:10:00'),
    -- Kolejne dni grudnia skrótowo
    (107, 6, 1, '2025-12-03', '06:00', '14:00', 'normalna', 1, '2025-11-25 07:00:00'),
    (108, 9, 1, '2025-12-03', '06:00', '14:00', 'normalna', 6, '2025-11-25 07:10:00'),
    (109, 10, 1, '2025-12-03', '14:00', '22:00', 'normalna', 6, '2025-11-25 07:15:00'),
    (110, 11, 1, '2025-12-03', '08:00', '16:00', 'normalna', 6, '2025-11-25 07:20:00'),
    (111, 7, 2, '2025-12-03', '12:00', '20:00', 'normalna', 1, '2025-11-25 10:00:00'),
    (112, 8, 2, '2025-12-03', '08:00', '16:00', 'normalna', 1, '2025-11-25 10:05:00'),
    (113, 12, 2, '2025-12-03', '10:00', '18:00', 'normalna', 8, '2025-11-25 10:10:00'),
    (114, 16, 4, '2025-12-03', '06:00', '14:00', 'normalna', 6, '2025-11-25 09:10:00'),
    (115, 17, 4, '2025-12-03', '05:00', '13:00', 'normalna', 6, '2025-11-25 09:15:00'),
    (116, 13, 10, '2025-12-03', '04:00', '12:00', 'normalna', 1, '2025-11-25 05:00:00'),
    (117, 14, 10, '2025-12-03', '05:00', '13:00', 'normalna', 1, '2025-11-25 05:05:00'),
    (118, 15, 10, '2025-12-03', '06:00', '14:00', 'normalna', 1, '2025-11-25 05:10:00'),
    (119, 23, 12, '2025-12-03', '06:00', '14:00', 'normalna', 2, '2025-11-25 08:00:00'),
    (120, 24, 12, '2025-12-03', '06:30', '14:30', 'normalna', 2, '2025-11-25 08:05:00'),
    (121, 25, 12, '2025-12-03', '07:00', '15:00', 'normalna', 2, '2025-11-25 08:10:00'),
    -- Podsumowanie dodatkowych zmian (kilka wybranych dni później w grudniu)
    (122, 7, 7, '2025-12-15', '11:00', '19:00', 'normalna', 2, '2025-12-05 11:00:00'),
    (123, 8, 7, '2025-12-15', '09:00', '17:00', 'normalna', 2, '2025-12-05 11:05:00'),
    (124, 9, 7, '2025-12-15', '07:00', '15:00', 'normalna', 2, '2025-12-05 11:10:00'),
    (125, 10, 7, '2025-12-15', '13:00', '21:00', 'normalna', 2, '2025-12-05 11:15:00'),
    (126, 11, 7, '2025-12-15', '06:00', '14:00', 'normalna', 2, '2025-12-05 11:20:00'),
    (127, 16, 7, '2025-12-15', '05:00', '13:00', 'normalna', 2, '2025-12-05 11:25:00'),
    (128, 17, 7, '2025-12-15', '05:00', '13:00', 'normalna', 2, '2025-12-05 11:30:00'),
    (129, 13, 10, '2025-12-15', '04:00', '12:00', 'normalna', 1, '2025-12-05 05:00:00'),
    (130, 14, 10, '2025-12-15', '05:00', '13:00', 'normalna', 1, '2025-12-05 05:05:00'),
    (131, 15, 10, '2025-12-15', '06:00', '14:00', 'normalna', 1, '2025-12-05 05:10:00'),
    (132, 23, 12, '2025-12-15', '06:00', '14:00', 'normalna', 2, '2025-12-05 08:00:00'),
    (133, 24, 12, '2025-12-15', '06:30', '14:30', 'normalna', 2, '2025-12-05 08:05:00'),
    (134, 25, 12, '2025-12-15', '07:00', '15:00', 'normalna', 2, '2025-12-05 08:10:00'),
    (135, 6, 4, '2025-12-15', '05:30', '13:30', 'normalna', 1, '2025-12-05 09:00:00'),
    (136, 16, 4, '2025-12-15', '06:00', '14:00', 'normalna', 6, '2025-12-05 09:10:00'),
    (137, 17, 4, '2025-12-15', '05:00', '13:00', 'normalna', 6, '2025-12-05 09:15:00'),
    (138, 18, 11, '2025-12-15', '06:15', '14:15', 'normalna', 1, '2025-12-05 06:40:00'),
    (139, 20, 8, '2025-12-15', '12:00', '20:00', 'normalna', 2, '2025-12-05 12:45:00'),
    (140, 21, 8, '2025-12-15', '12:00', '20:00', 'normalna', 2, '2025-12-05 12:50:00');

-- Raporty pracy za listopad-grudzień 2025
INSERT INTO public.work_reports (report_id, user_id, project_id, work_date, hours_spent, created_at, minutes_spent, description, time_from, time_to, status, submitted_at, approved_at, rejected_at, reviewed_by_user_id, reviewer_comment)
VALUES
    -- Rozszerzone raporty (fragment 1: 60 wpisów) – różne statusy
    (1, 6, 1, '2025-11-03', 8, '2025-11-03 14:10:00', 0, 'Produkcja baz sosów + kontrola mise en place.', NULL, NULL, 'zaakceptowany', '2025-11-03 14:10:00+01', '2025-11-04 09:00:00+01', NULL, 1, 'Bez uwag.'),
    (2, 9, 1, '2025-11-03', 8, '2025-11-03 14:05:00', 0, 'Przygotowanie warzyw i obróbka mięsa (linia lunch).', NULL, NULL, 'zaakceptowany', '2025-11-03 14:05:00+01', '2025-11-04 09:05:00+01', NULL, 6, 'Poprawna organizacja.'),
    (3, 10, 1, '2025-11-03', 8, '2025-11-03 22:15:00', 0, 'Wieczorna produkcja dań kolacyjnych + serwis.', NULL, NULL, 'zaakceptowany', '2025-11-03 22:15:00+01', '2025-11-04 09:05:00+01', NULL, 6, 'Serwis płynny.'),
    (4, 11, 1, '2025-11-03', 8, '2025-11-03 16:20:00', 0, 'Wsparcie sekcji zimnej + kontrola magazynku przypraw.', NULL, NULL, 'zaakceptowany', '2025-11-03 16:20:00+01', '2025-11-04 09:10:00+01', NULL, 6, 'Magazynek uporządkowany.'),
    (5, 7, 2, '2025-11-03', 8, '2025-11-03 20:05:00', 0, 'Test nowego menu degustacyjnego (wersja jesienna).', NULL, NULL, 'zaakceptowany', '2025-11-03 20:05:00+01', '2025-11-04 10:00:00+01', NULL, 1, 'Akceptacja smaków.'),
    (6, 8, 2, '2025-11-03', 8, '2025-11-03 16:05:00', 0, 'Przygotowanie amuse-bouche i selekcja składników premium.', NULL, NULL, 'zaakceptowany', '2025-11-03 16:05:00+01', '2025-11-04 10:05:00+01', NULL, 1, 'Dobrze dobrane produkty.'),
    (7, 12, 2, '2025-11-03', 8, '2025-11-03 18:10:00', 0, 'Sekcja deserów degustacyjnych – talerz jesienny.', NULL, NULL, 'zaakceptowany', '2025-11-03 18:10:00+01', '2025-11-04 10:10:00+01', NULL, 8, 'Prezentacja estetyczna.'),
    (8, 6, 4, '2025-11-03', 8, '2025-11-03 13:40:00', 0, 'Koordynacja linii pakowania lunchy TechWave.', NULL, NULL, 'zaakceptowany', '2025-11-03 13:40:00+01', '2025-11-04 09:20:00+01', NULL, 1, 'Pakowanie sprawne.'),
    (9, 16, 4, '2025-11-03', 8, '2025-11-03 14:05:00', 0, 'Transport pierwszej tury dostaw (poranne okno).', NULL, NULL, 'zaakceptowany', '2025-11-03 14:05:00+01', '2025-11-04 09:25:00+01', NULL, 6, 'Dostawy na czas.'),
    (10, 17, 4, '2025-11-03', 8, '2025-11-03 13:35:00', 0, 'Załadunek i optymalizacja kolejności tras.', NULL, NULL, 'zaakceptowany', '2025-11-03 13:35:00+01', '2025-11-04 09:30:00+01', NULL, 6, 'Optymalizacja poprawna.'),
    (11, 13, 10, '2025-11-03', 8, '2025-11-03 12:05:00', 0, 'Produkcja korpusów tart i kremów bazowych.', NULL, NULL, 'zaakceptowany', '2025-11-03 12:05:00+01', '2025-11-04 08:50:00+01', NULL, 1, 'Stabilna jakość.'),
    (12, 14, 10, '2025-11-03', 8, '2025-11-03 13:10:00', 0, 'Wypiek ciast drożdżowych + kontrola temperatur.', NULL, NULL, 'zaakceptowany', '2025-11-03 13:10:00+01', '2025-11-04 08:55:00+01', NULL, 13, 'Temperatury bez odchyleń.'),
    (13, 15, 10, '2025-11-03', 8, '2025-11-03 14:05:00', 0, 'Dekoracja monoporcji i przygotowanie glazur.', NULL, NULL, 'zaakceptowany', '2025-11-03 14:05:00+01', '2025-11-04 09:00:00+01', NULL, 13, 'Precyzyjne wykończenie.'),
    (14, 23, 12, '2025-11-03', 8, '2025-11-03 14:20:00', 0, 'Przyjęcie dostawy warzyw – weryfikacja jakości.', NULL, NULL, 'zaakceptowany', '2025-11-03 14:20:00+01', '2025-11-04 09:10:00+01', NULL, 3, 'Bez braków.'),
    (15, 24, 12, '2025-11-03', 8, '2025-11-03 14:30:00', 0, 'Rozładunek nabiału + rotacja zapasów chłodniczych.', NULL, NULL, 'zaakceptowany', '2025-11-03 14:30:00+01', '2025-11-04 09:15:00+01', NULL, 3, 'FIFO zachowane.'),
    (16, 25, 12, '2025-11-03', 8, '2025-11-03 15:05:00', 0, 'Inwentaryzacja przypraw i suchych składników.', NULL, NULL, 'zaakceptowany', '2025-11-03 15:05:00+01', '2025-11-04 09:20:00+01', NULL, 3, 'Stany spójne.'),
    (17, 6, 1, '2025-11-04', 8, '2025-11-04 14:15:00', 0, 'Kontrola jakości sosów poprzedniego dnia + korekty smaku.', NULL, NULL, 'zaakceptowany', '2025-11-04 14:15:00+01', '2025-11-05 09:00:00+01', NULL, 1, 'Smaki zbalansowane.'),
    (18, 9, 1, '2025-11-04', 8, '2025-11-04 14:05:00', 0, 'Obróbka ryb – filety + marynaty cytrusowe.', NULL, NULL, 'zaakceptowany', '2025-11-04 14:05:00+01', '2025-11-05 09:05:00+01', NULL, 6, 'Filetowanie poprawne.'),
    (19, 10, 1, '2025-11-04', 8, '2025-11-04 22:05:00', 0, 'Serwis kolacyjny – sekcja gorąca i plating.', NULL, NULL, 'zaakceptowany', '2025-11-04 22:05:00+01', '2025-11-05 09:05:00+01', NULL, 6, 'Płynny plating.'),
    (20, 11, 1, '2025-11-04', 8, '2025-11-04 16:10:00', 0, 'Przygotowanie past warzywnych + kontrola alergennych składników.', NULL, NULL, 'zaakceptowany', '2025-11-04 16:10:00+01', '2025-11-05 09:10:00+01', NULL, 6, 'Oznaczenia poprawne.'),
    (21, 7, 2, '2025-11-04', 8, '2025-11-04 20:05:00', 0, 'Dopracowanie tekstur sosów degustacyjnych.', NULL, NULL, 'zaakceptowany', '2025-11-04 20:05:00+01', '2025-11-05 10:00:00+01', NULL, 1, 'Sosy stabilne.'),
    (22, 8, 2, '2025-11-04', 8, '2025-11-04 16:05:00', 0, 'Selekcja mięs premium pod kolację biznesową.', NULL, NULL, 'zaakceptowany', '2025-11-04 16:05:00+01', '2025-11-05 10:05:00+01', NULL, 1, 'Jakość bardzo dobra.'),
    (23, 12, 2, '2025-11-04', 8, '2025-11-04 18:15:00', 0, 'Desery: stabilizacja musów w chłodni.', NULL, NULL, 'zaakceptowany', '2025-11-04 18:15:00+01', '2025-11-05 10:10:00+01', NULL, 8, 'Musy utrwalone.'),
    (24, 6, 4, '2025-11-04', 8, '2025-11-04 13:35:00', 0, 'Kontrola porcji lunchowych (zgodność gramatur).', NULL, NULL, 'zaakceptowany', '2025-11-04 13:35:00+01', '2025-11-05 09:20:00+01', NULL, 1, 'Gramatury w normie.'),
    (25, 16, 4, '2025-11-04', 8, '2025-11-04 14:00:00', 0, 'Dostawa do TechWave – trasa południowa.', NULL, NULL, 'zaakceptowany', '2025-11-04 14:00:00+01', '2025-11-05 09:25:00+01', NULL, 6, 'Dostawa bez opóźnień.'),
    (26, 17, 4, '2025-11-04', 8, '2025-11-04 13:25:00', 0, 'Pakowanie pojemników izotermicznych.', NULL, NULL, 'zaakceptowany', '2025-11-04 13:25:00+01', '2025-11-05 09:30:00+01', NULL, 6, 'Izotermy szczelne.'),
    (27, 13, 10, '2025-11-04', 8, '2025-11-04 12:10:00', 0, 'Przygotowanie kremów śmietanowych – kontrola lepkości.', NULL, NULL, 'zaakceptowany', '2025-11-04 12:10:00+01', '2025-11-05 08:50:00+01', NULL, 1, 'Parametry ok.'),
    (28, 14, 10, '2025-11-04', 8, '2025-11-04 13:05:00', 0, 'Wypiek herbatników korzennych – test partii.', NULL, NULL, 'zaakceptowany', '2025-11-04 13:05:00+01', '2025-11-05 08:55:00+01', NULL, 13, 'Jednolity kolor.'),
    (29, 15, 10, '2025-11-04', 8, '2025-11-04 14:00:00', 0, 'Nadzór nad temperowaniem czekolady.', NULL, NULL, 'zaakceptowany', '2025-11-04 14:00:00+01', '2025-11-05 09:00:00+01', NULL, 13, 'Połysk właściwy.'),
    (30, 23, 12, '2025-11-04', 8, '2025-11-04 14:10:00', 0, 'Przegląd świeżości zieleniny – odrzuty minimalne.', NULL, NULL, 'zaakceptowany', '2025-11-04 14:10:00+01', '2025-11-05 09:10:00+01', NULL, 3, 'Zielenina dobra.'),
    (31, 24, 12, '2025-11-04', 8, '2025-11-04 14:25:00', 0, 'Sortowanie nabiału według dat ważności.', NULL, NULL, 'zaakceptowany', '2025-11-04 14:25:00+01', '2025-11-05 09:15:00+01', NULL, 3, 'FIFO utrzymane.'),
    (32, 25, 12, '2025-11-04', 8, '2025-11-04 15:00:00', 0, 'Uzupełnianie etykiet alergennych.', NULL, NULL, 'zaakceptowany', '2025-11-04 15:00:00+01', '2025-11-05 09:20:00+01', NULL, 3, 'Wszystkie etykiety.'),
    -- Raport oczekujący na akceptację
    (33, 10, 1, '2025-11-05', 8, '2025-11-05 22:10:00', 0, 'Serwis kolacyjny – większy ruch, korekty platingu.', NULL, NULL, 'oczekuje_na_akceptacje', '2025-11-05 22:10:00+01', NULL, NULL, NULL, NULL),
    (34, 6, 1, '2025-11-05', 8, '2025-11-05 14:20:00', 0, 'Udoskonalenie redukcji demi-glace.', NULL, NULL, 'zaakceptowany', '2025-11-05 14:20:00+01', '2025-11-06 09:00:00+01', NULL, 1, 'Redukcja klarowna.'),
    (35, 9, 1, '2025-11-05', 8, '2025-11-05 14:05:00', 0, 'Filetowanie drobiu – przygotowanie partii na jutro.', NULL, NULL, 'zaakceptowany', '2025-11-05 14:05:00+01', '2025-11-06 09:05:00+01', NULL, 6, 'Równy rozmiar.'),
    (36, 11, 1, '2025-11-05', 8, '2025-11-05 16:05:00', 0, 'Sosy zimne – korekta przypraw cytrusowych.', NULL, NULL, 'zaakceptowany', '2025-11-05 16:05:00+01', '2025-11-06 09:10:00+01', NULL, 6, 'Smak świeży.'),
    (37, 7, 2, '2025-11-05', 8, '2025-11-05 20:05:00', 0, 'Kalibracja temperatur sous-vide.', NULL, NULL, 'zaakceptowany', '2025-11-05 20:05:00+01', '2025-11-06 10:00:00+01', NULL, 1, 'Parametry stabilne.'),
    (38, 8, 2, '2025-11-05', 8, '2025-11-05 16:05:00', 0, 'Plating amuse-bouche – seria testowa.', NULL, NULL, 'zaakceptowany', '2025-11-05 16:05:00+01', '2025-11-06 10:05:00+01', NULL, 1, 'Estetyczne.'),
    (39, 12, 2, '2025-11-05', 8, '2025-11-05 18:15:00', 0, 'Stabilizacja lodów – kontrola krystalizacji.', NULL, NULL, 'zaakceptowany', '2025-11-05 18:15:00+01', '2025-11-06 10:10:00+01', NULL, 8, 'Tekstura ok.'),
    (40, 6, 4, '2025-11-05', 8, '2025-11-05 13:30:00', 0, 'Kontrola listy diet specjalnych.', NULL, NULL, 'zaakceptowany', '2025-11-05 13:30:00+01', '2025-11-06 09:20:00+01', NULL, 1, 'Lista zaktualizowana.'),
    (41, 16, 4, '2025-11-05', 8, '2025-11-05 14:00:00', 0, 'Trasa północna – dostawy zimne.', NULL, NULL, 'zaakceptowany', '2025-11-05 14:00:00+01', '2025-11-06 09:25:00+01', NULL, 6, 'Czas ok.'),
    (42, 17, 4, '2025-11-05', 8, '2025-11-05 13:25:00', 0, 'Pakowanie diet bezglutenowych.', NULL, NULL, 'zaakceptowany', '2025-11-05 13:25:00+01', '2025-11-06 09:30:00+01', NULL, 6, 'Etykiety poprawne.'),
    (43, 13, 10, '2025-11-05', 8, '2025-11-05 12:05:00', 0, 'Przygotowanie mas makowych.', NULL, NULL, 'zaakceptowany', '2025-11-05 12:05:00+01', '2025-11-06 08:50:00+01', NULL, 1, 'Konsystencja dobra.'),
    (44, 14, 10, '2025-11-05', 8, '2025-11-05 13:05:00', 0, 'Partia biszkoptów świątecznych – test wilgotności.', NULL, NULL, 'zaakceptowany', '2025-11-05 13:05:00+01', '2025-11-06 08:55:00+01', NULL, 13, 'Wilgotność stabilna.'),
    (45, 15, 10, '2025-11-05', 8, '2025-11-05 14:05:00', 0, 'Nadzór nad chłodzeniem glazur lustrzanych.', NULL, NULL, 'zaakceptowany', '2025-11-05 14:05:00+01', '2025-11-06 09:00:00+01', NULL, 13, 'Powierzchnia równa.'),
    (46, 23, 12, '2025-11-05', 8, '2025-11-05 14:15:00', 0, 'Przyjęcie mrożonek – kontrola łańcucha chłodniczego.', NULL, NULL, 'zaakceptowany', '2025-11-05 14:15:00+01', '2025-11-06 09:10:00+01', NULL, 3, 'Temperatury w normie.'),
    (47, 24, 12, '2025-11-05', 8, '2025-11-05 14:25:00', 0, 'Ewidencja stanów olejów i tłuszczów.', NULL, NULL, 'zaakceptowany', '2025-11-05 14:25:00+01', '2025-11-06 09:15:00+01', NULL, 3, 'Stany zgodne.'),
    (48, 25, 12, '2025-11-05', 8, '2025-11-05 15:05:00', 0, 'Etykietowanie nowej partii orzechów.', NULL, NULL, 'zaakceptowany', '2025-11-05 15:05:00+01', '2025-11-06 09:20:00+01', NULL, 3, 'Etykiety kompletne.'),
    -- Raport odrzucony przykład
    (49, 10, 1, '2025-11-06', 9, '2025-11-06 22:30:00', 30, 'Kolacja – przekroczony czas pracy (wydłużony serwis).', NULL, NULL, 'odrzucony', '2025-11-06 22:30:00+01', NULL, '2025-11-07 09:30:00+01', 6, 'Przekroczony limit – skoryguj.'),
    (50, 6, 1, '2025-11-06', 8, '2025-11-06 14:10:00', 0, 'Utrzymanie redukcji sosów, kontrola smaków.', NULL, NULL, 'zaakceptowany', '2025-11-06 14:10:00+01', '2025-11-07 09:00:00+01', NULL, 1, 'Stabilnie.'),
    (51, 9, 1, '2025-11-06', 8, '2025-11-06 14:05:00', 0, 'Przygotowanie farszów do pierogów lunchowych.', NULL, NULL, 'zaakceptowany', '2025-11-06 14:05:00+01', '2025-11-07 09:05:00+01', NULL, 6, 'Smak ok.'),
    (52, 11, 1, '2025-11-06', 8, '2025-11-06 16:05:00', 0, 'Sekcja zimna – sałatki sezonowe.', NULL, NULL, 'zaakceptowany', '2025-11-06 16:05:00+01', '2025-11-07 09:10:00+01', NULL, 6, 'Estetyczne.'),
    (53, 7, 2, '2025-11-06', 8, '2025-11-06 20:05:00', 0, 'Test nowej tekstury puree z topinamburu.', NULL, NULL, 'zaakceptowany', '2025-11-06 20:05:00+01', '2025-11-07 10:00:00+01', NULL, 1, 'Akceptuję.'),
    (54, 8, 2, '2025-11-06', 8, '2025-11-06 16:05:00', 0, 'Weryfikacja jakości wagyu – partia próbna.', NULL, NULL, 'zaakceptowany', '2025-11-06 16:05:00+01', '2025-11-07 10:05:00+01', NULL, 1, 'Jakość znakomita.'),
    (55, 12, 2, '2025-11-06', 8, '2025-11-06 18:10:00', 0, 'Desery – formowanie czekolady strukturalnej.', NULL, NULL, 'zaakceptowany', '2025-11-06 18:10:00+01', '2025-11-07 10:10:00+01', NULL, 8, 'Struktura dobra.'),
    (56, 6, 4, '2025-11-06', 8, '2025-11-06 13:30:00', 0, 'Lista diet – aktualizacja alergennych pozycji.', NULL, NULL, 'zaakceptowany', '2025-11-06 13:30:00+01', '2025-11-07 09:20:00+01', NULL, 1, 'Zaktualizowane.'),
    (57, 16, 4, '2025-11-06', 8, '2025-11-06 14:00:00', 0, 'Dostawa – korekta trasy ze względu na remont.', NULL, NULL, 'zaakceptowany', '2025-11-06 14:00:00+01', '2025-11-07 09:25:00+01', NULL, 6, 'Adaptacja udana.'),
    (58, 17, 4, '2025-11-06', 8, '2025-11-06 13:25:00', 0, 'Pakowanie lunchy – większa seria.', NULL, NULL, 'zaakceptowany', '2025-11-06 13:25:00+01', '2025-11-07 09:30:00+01', NULL, 6, 'Tempo dobre.'),
    (59, 13, 10, '2025-11-06', 8, '2025-11-06 12:05:00', 0, 'Masło orzechowe – prażenie partii testowej.', NULL, NULL, 'zaakceptowany', '2025-11-06 12:05:00+01', '2025-11-07 08:50:00+01', NULL, 1, 'Aromat intensywny.'),
    (60, 14, 10, '2025-11-06', 8, '2025-11-06 13:05:00', 0, 'Ciastka kruche – uniformizacja grubości.', NULL, NULL, 'zaakceptowany', '2025-11-06 13:05:00+01', '2025-11-07 08:55:00+01', NULL, 13, 'Grubość równa.');

-- Logi audytu (fragment najbardziej istotnych operacji)
INSERT INTO public.audit_logs (log_id, user_id, user_email, user_role, action, method, path, status_code, ip_address, user_agent, detail, duration_ms, created_at, action_group, entity_type, entity_id)
VALUES
    (1, 2, 'bartek.radwan@apollo-catering.pl', 'hr', 'POST /absences', 'POST', '/absences/', 201, '10.0.0.12', 'Mozilla/5.0', 'Dodano wniosek urlopowy #1', 120, '2025-11-29 11:06:00+01', 'absences', 'absence', 1),
    (2, 2, 'bartek.radwan@apollo-catering.pl', 'hr', 'PATCH /absences/1', 'PATCH', '/absences/1', 200, '10.0.0.12', 'Mozilla/5.0', 'Zmieniono status na zaakceptowany', 95, '2025-11-30 09:16:30+01', 'absences', 'absence', 1),
    (3, 4, 'damian.lis@apollo-catering.pl', 'user', 'POST /work_reports', 'POST', '/work_reports/', 201, '10.0.0.32', 'Mozilla/5.0', 'Raport pracy dla projektu 2 (event fintech)', 150, '2025-12-12 23:41:00+01', 'work_reports', 'work_report', 6);

-- Aktualizacja sekwencji ID
SELECT setval('public.users_user_id_seq', (SELECT COALESCE(MAX(user_id), 1) FROM public.users));
SELECT setval('public.projects_project_id_seq', (SELECT COALESCE(MAX(project_id), 1) FROM public.projects));
SELECT setval('public.user_projects_user_project_id_seq', (SELECT COALESCE(MAX(user_project_id), 1) FROM public.user_projects));
SELECT setval('public.messages_message_id_seq', (SELECT COALESCE(MAX(message_id), 1) FROM public.messages));
SELECT setval('public.period_closures_period_closure_id_seq', (SELECT COALESCE(MAX(period_closure_id), 1) FROM public.period_closures));
SELECT setval('public.absences_absence_id_seq', (SELECT COALESCE(MAX(absence_id), 1) FROM public.absences));
SELECT setval('public.approval_log_approval_log_id_seq', (SELECT COALESCE(MAX(approval_log_id), 1) FROM public.approval_log));
SELECT setval('public.schedule_schedule_id_seq', (SELECT COALESCE(MAX(schedule_id), 1) FROM public.schedule));
SELECT setval('public.work_reports_report_id_seq', (SELECT COALESCE(MAX(report_id), 1) FROM public.work_reports));
SELECT setval('public.audit_logs_log_id_seq', (SELECT COALESCE(MAX(log_id), 1) FROM public.audit_logs));

COMMIT;

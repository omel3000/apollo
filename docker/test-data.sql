-- Dane testowe Apollo (firma gastronomiczna) - listopad/grudzień 2025
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

-- Użytkownicy (rola administracyjna, HR i zespół operacyjny)
INSERT INTO public.users (user_id, first_name, last_name, email, phone_number, password_hash, role, registration_date, account_status, password_reset_token, birth_date, address)
VALUES
    (1, 'Agnieszka', 'Maj', 'adm@op.pl', '+48 600 111 222', '$2a$12$uLvQDJ5yiyFmCoH.rHZYi.7lbVsEnYJ/H5CoLG.hOujWIISKIEmlq', 'admin', '2023-08-14 09:15:00', 'aktywny', NULL, '1985-04-18', 'ul. Dolna 12, Warszawa'), -- hasło: Ap0llo!Admin
    (2, 'Bartek', 'Radwan', 'hr@op.pl', '+48 600 333 111', '$2a$12$85Csvn.pAmmXKHyTIwGdKed5hzrE47YaD8j3AXHKzd0CfN8cknj.m', 'hr', '2023-09-02 08:45:00', 'aktywny', NULL, '1988-11-02', 'ul. Górnośląska 5, Warszawa'), -- hasło: Ap0llo!HR
    (3, 'Celina', 'Wróbel', 'celina.wrobel@apollo-catering.pl', '+48 601 444 555', '$2a$12$nkfEiUWCAaLsylBJyis1t.6dVZlEO40uSHKt9UMB6qfK5b7dNPfwO', 'worker', '2024-01-10 07:55:00', 'aktywny', NULL, '1990-02-21', 'ul. Różana 22, Warszawa'), -- hasło: Ap0llo!Chef1
    (4, 'Damian', 'Lis', 'damian.lis@apollo-catering.pl', '+48 602 999 101', '$2a$12$cSiBNqMDMxJo9hk52p6zeOixguTDeYpKl3L7htckU59FCFWtm4QFa', 'worker', '2024-03-04 06:40:00', 'aktywny', NULL, '1992-07-12', 'ul. Pileckiego 3, Warszawa'), -- hasło: Ap0llo!Chef2
    (5, 'Ewa', 'Kaczor', 'ewa.kaczor@apollo-catering.pl', '+48 603 210 310', '$2a$12$vYgVW/YRMwWo.vgwRMeluOTR8jD6ubl9mV6MwrIpG2AEckvKQR86i', 'worker', '2024-05-15 08:10:00', 'aktywny', NULL, '1994-05-06', 'ul. Woronicza 18, Warszawa'), -- hasło: Ap0llo!Pastry
    (6, 'Filip', 'Nowak', 'filip.nowak@apollo-catering.pl', '+48 604 630 730', '$2a$12$34b2oCOUAe.lGDhie.nFeebpSvAu4Ch//i4u3VObjYvJ3jD1y6Yqi', 'worker', '2024-06-01 07:20:00', 'aktywny', NULL, '1991-12-01', 'ul. Jana III Sobieskiego 102, Warszawa'), -- hasło: Ap0llo!Logistyka
    (7, 'Gabriela', 'Sowa', 'gabriela.sowa@apollo-catering.pl', '+48 605 880 990', '$2a$12$oeX68aVmkqGbWCMRj4ny2.e/CKGHStWShmZdQrDZ4WjvC.7mQkGTO', 'worker', '2024-07-22 09:05:00', 'aktywny', NULL, '1996-09-30', 'ul. Puławska 44, Warszawa'); -- hasło: Ap0llo!Serwis

-- Projekty (ciągłe kontrakty gastronomiczne)
INSERT INTO public.projects (project_id, project_name, description, owner_user_id, status, created_by_user_id, created_at, time_type)
VALUES
    (1, 'Stała obsługa restauracji Mokotów', 'Codzienna produkcja menu lunchowego i kolacyjnego w lokalu na Mokotowie.', 3, 'aktywny', 1, '2025-01-05 08:00:00', 'constant'),
    (2, 'Eventy świąteczne 2025', 'Obsługa kolacji wigilijnych i bankietów firmowych od 15.11 do 31.12.', 4, 'aktywny', 2, '2025-09-15 10:00:00', 'from_to'),
    (3, 'TechWave Lunch Program', 'Dostawy lunchów premium (pon-pt) do siedziby TechWave na Służewcu.', 6, 'aktywny', 1, '2025-08-22 09:30:00', 'constant');

-- Przypisania użytkowników do projektów
INSERT INTO public.user_projects (user_project_id, user_id, project_id, assigned_at)
VALUES
    (1, 3, 1, '2024-02-01 07:30:00'),
    (2, 3, 2, '2025-10-01 07:30:00'),
    (3, 4, 1, '2024-03-10 06:00:00'),
    (4, 4, 2, '2025-10-02 06:00:00'),
    (5, 5, 1, '2024-05-20 08:00:00'),
    (6, 6, 2, '2025-10-05 05:45:00'),
    (7, 6, 3, '2025-08-25 05:45:00'),
    (8, 7, 2, '2025-10-15 09:00:00');

-- Komunikaty systemowe
INSERT INTO public.messages (message_id, title, content, created_at, is_active)
VALUES
    (1, 'Inwentaryzacja magazynu 15 grudnia', 'Zespół produkcyjny proszony jest o zakończenie rozchodów surowców do 14.12 godz. 18:00.', '2025-11-30 08:00:00', true),
    (2, 'Nowy kontrakt TechWave', 'Od 03.11 zwiększamy wolumen lunchy dla TechWave do 320 porcji dziennie.', '2025-10-28 09:45:00', true);

-- Statusy okresów rozliczeniowych
INSERT INTO public.period_closures (period_closure_id, year, month, status, locked_by_user_id, locked_at, unlocked_at, notes)
VALUES
    (1, 2025, 10, 'zamkniety', 2, '2025-11-05 14:30:00+01', NULL, 'Rozliczenie października zamknięte po inwentaryzacji.'),
    (2, 2025, 11, 'oczekuje_na_zamkniecie', NULL, NULL, NULL, 'Czekamy na raporty z eventów świątecznych.'),
    (3, 2025, 12, 'otwarty', NULL, NULL, NULL, 'Okres dopiero otwarty, planowane zwiększone obłożenie.');

-- Dostępność kluczowych pracowników
INSERT INTO public.availability (user_id, date, is_available, time_from, time_to, created_at)
VALUES
    (6, '2025-11-20', true, '06:00', '14:00', '2025-11-15 08:00:00'),
    (6, '2025-12-05', true, '12:00', '20:00', '2025-11-28 07:55:00'),
    (5, '2025-12-24', false, NULL, NULL, '2025-12-01 09:10:00'),
    (4, '2025-11-28', true, '08:00', '16:00', '2025-11-20 06:40:00');

-- Nieobecności (urlopy i odrzucenia)
INSERT INTO public.absences (absence_id, user_id, absence_type, date_from, date_to, created_at, status, submitted_at, approved_at, rejected_at, reviewed_by_user_id, reviewer_comment)
VALUES
    (1, 5, 'urlop', '2025-12-24', '2025-12-27', '2025-11-29 11:00:00', 'zaakceptowany', '2025-11-29 11:05:00+01', '2025-11-30 09:15:00+01', NULL, 2, 'Urlop świąteczny zatwierdzony, zespół cukierni zabezpieczony.'),
    (2, 7, 'inne', '2025-11-10', '2025-11-11', '2025-11-03 15:00:00', 'odrzucony', '2025-11-03 15:05:00+01', NULL, '2025-11-04 10:20:00+01', 2, 'Odrzucono z powodu braku zastępstwa na bankiet.');

-- Rejestr decyzji akceptacyjnych
INSERT INTO public.approval_log (approval_log_id, entity_type, entity_id, action, actor_user_id, comment, created_at)
VALUES
    (1, 'absence', 1, 'approved', 2, 'Potwierdzam urlop Ewy po uzgodnieniu z Celiną.', '2025-11-30 09:16:00+01'),
    (2, 'absence', 2, 'rejected', 2, 'Brak możliwości zwolnienia Gabrieli w szczycie sezonu.', '2025-11-04 10:21:00+01');

-- Harmonogram zmian (próbka kluczowych dni)
INSERT INTO public.schedule (schedule_id, user_id, project_id, work_date, time_from, time_to, shift_type, created_by_user_id, created_at)
VALUES
    (1, 4, 1, '2025-11-18', '06:00', '14:00', 'normalna', 3, '2025-11-10 07:00:00'),
    (2, 5, 1, '2025-11-25', '07:00', '15:00', 'normalna', 3, '2025-11-17 09:10:00'),
    (3, 6, 2, '2025-12-05', '13:00', '21:00', 'normalna', 4, '2025-11-26 08:30:00'),
    (4, 7, 2, '2025-12-12', '15:00', '23:00', 'normalna', 4, '2025-12-01 10:45:00'),
    (5, 3, 3, '2025-11-21', '05:30', '13:30', 'normalna', 1, '2025-11-12 08:05:00');

-- Raporty pracy za listopad-grudzień 2025
INSERT INTO public.work_reports (report_id, user_id, project_id, work_date, hours_spent, created_at, minutes_spent, description, time_from, time_to, status, submitted_at, approved_at, rejected_at, reviewed_by_user_id, reviewer_comment)
VALUES
    (1, 4, 1, '2025-11-18', 8.00, '2025-11-18 17:05:00', 0, 'Przygotowanie sosów bazowych i kontrola jakości linii gorącej.', NULL, NULL, 'zaakceptowany', '2025-11-18 17:05:00+01', '2025-11-19 09:00:00+01', NULL, 3, 'Raport zgodny z grafikiem.'),
    (2, 5, 1, '2025-11-25', 7.00, '2025-11-25 16:10:00', 30, 'Produkcja deserów świątecznych (sernik piernikowy, makowiec).', NULL, NULL, 'zaakceptowany', '2025-11-25 16:10:00+01', '2025-11-26 08:15:00+01', NULL, 3, 'Desery odebrane na czas.'),
    (3, 6, 2, '2025-12-05', 7.00, '2025-12-05 22:40:00', 30, 'Koordynacja transportu i ustawienia bufetu podczas gali fintech.', '13:00', '21:30', 'zaakceptowany', '2025-12-05 22:40:00+01', '2025-12-06 09:05:00+01', NULL, 4, 'Świetne tempo montażu.'),
    (4, 7, 2, '2025-12-05', 6.00, '2025-12-05 22:35:00', 45, 'Serwis kelnerski na gali fintech (20 stolików).', '14:45', '21:30', 'zaakceptowany', '2025-12-05 22:35:00+01', '2025-12-06 09:10:00+01', NULL, 4, 'Zero reklamacji od klienta.'),
    (5, 3, 3, '2025-11-21', 8.00, '2025-11-21 14:05:00', 0, 'Planowanie produkcji i degustacja nowej karty TechWave.', NULL, NULL, 'zaakceptowany', '2025-11-21 14:05:00+01', '2025-11-22 08:50:00+01', NULL, 1, 'Degustacja potwierdzona przez klienta.'),
    (6, 4, 2, '2025-12-12', 5.00, '2025-12-12 23:40:00', 30, 'Wsparcie kuchni live cooking podczas wigilii korporacyjnej.', '17:00', '22:30', 'oczekuje_na_akceptacje', '2025-12-12 23:40:00+01', NULL, NULL, NULL, NULL),
    (7, 6, 3, '2025-11-29', 6.00, '2025-11-29 14:20:00', 15, 'Optymalizacja tras dostaw lunchy + aktualizacja stanów magazynowych.', NULL, NULL, 'zaakceptowany', '2025-11-29 14:20:00+01', '2025-11-30 09:30:00+01', NULL, 1, 'Zatwierdzono po audycie stanów.'),
    (8, 5, 1, '2025-12-03', 4.00, '2025-12-03 12:30:00', 45, 'Próba nowych monoporcji na sylwestra (test dekoracji).', NULL, NULL, 'roboczy', NULL, NULL, NULL, NULL, NULL);

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

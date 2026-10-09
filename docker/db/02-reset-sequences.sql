-- O eduFinance.sql insere os dados com IDs fixos (OVERRIDING SYSTEM VALUE),
-- o que não avança as sequences. Sem isto, o primeiro INSERT feito pela
-- aplicação tentaria usar id = 1 e falharia com chave duplicada.
DO $$
DECLARE
    r RECORD;
    max_id BIGINT;
BEGIN
    FOR r IN
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND is_identity = 'YES'
    LOOP
        EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', r.column_name, r.table_name) INTO max_id;
        IF max_id > 0 THEN
            PERFORM setval(pg_get_serial_sequence(format('%I', r.table_name), r.column_name), max_id);
        END IF;
    END LOOP;
END $$;

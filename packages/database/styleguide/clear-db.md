# Clear Database

```sh
psql "connection-string"
```

```sql
DO $$
DECLARE
    object_name record;
BEGIN
    FOR object_name IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', object_name.tablename);
    END LOOP;
    FOR object_name IN
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('DROP SEQUENCE IF EXISTS public.%I CASCADE', object_name.sequence_name);
    END LOOP;
    FOR object_name IN
        SELECT t.typname
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typtype = 'e'
    LOOP
        EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', object_name.typname);
    END LOOP;
END
$$;
```

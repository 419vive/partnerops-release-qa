\set ON_ERROR_STOP on

BEGIN TRANSACTION READ ONLY;

DO $$
DECLARE
    qa_request_count integer;
    qa_idempotency_count integer;
    qa_audit_count integer;
    qa_client_mismatch_count integer;
    qa_invalid_write_count integer;
    invariant_count integer;
BEGIN
    SELECT count(*)
      INTO qa_request_count
      FROM service_request
     WHERE title LIKE 'QA API replay%';

    IF qa_request_count <> 1 THEN
        RAISE EXCEPTION 'Expected exactly one QA API replay request, found %', qa_request_count;
    END IF;

    SELECT count(*)
      INTO qa_idempotency_count
      FROM idempotency_record i
      JOIN service_request r ON r.id = i.service_request_id
      JOIN api_credential c ON c.id = i.api_credential_id
     WHERE r.title LIKE 'QA API replay%'
       AND i.idempotency_key LIKE 'qa-replay-%'
       AND r.status = 'new'
       AND c.selector = 'demo01'
       AND r.created_by_credential_id = c.id;

    IF qa_idempotency_count <> 1 THEN
        RAISE EXCEPTION 'Expected one matching idempotency record, found %', qa_idempotency_count;
    END IF;

    SELECT count(*)
      INTO qa_client_mismatch_count
      FROM service_request r
      LEFT JOIN api_credential c ON c.id = r.created_by_credential_id
     WHERE r.title LIKE 'QA API replay%'
       AND (r.created_by_credential_id IS NULL OR c.id IS NULL OR r.client_id <> c.client_id);

    IF qa_client_mismatch_count <> 0 THEN
        RAISE EXCEPTION 'API-created request client does not match its credential client';
    END IF;

    SELECT count(*)
      INTO qa_audit_count
      FROM audit_event a
      JOIN service_request r ON r.public_id = a.subject_public_id
     WHERE r.title LIKE 'QA API replay%'
       AND a."action" = 'request.created'
       AND a.subject_type = 'service_request'
       AND a.actor_type = 'api_credential'
       AND a.actor_id IS NULL
       AND a.client_id = r.client_id;

    IF qa_audit_count <> 1 THEN
        RAISE EXCEPTION 'Expected one request.created audit event, found %', qa_audit_count;
    END IF;

    SELECT
        (SELECT count(*) FROM service_request WHERE title = 'x' AND description = 'too short')
        + (SELECT count(*) FROM idempotency_record WHERE idempotency_key LIKE 'qa-api-validation-%')
      INTO qa_invalid_write_count;

    IF qa_invalid_write_count <> 0 THEN
        RAISE EXCEPTION 'Invalid API payload left request or idempotency data';
    END IF;

    SELECT count(*)
      INTO invariant_count
     FROM pg_constraint
     WHERE conname IN ('chk_request_origin', 'chk_idempotency_expiry')
       AND convalidated;

    IF invariant_count <> 2 THEN
        RAISE EXCEPTION 'Required database constraints are missing';
    END IF;
END
$$;

SELECT 'DB-001 release_assertions_passed' AS result;

COMMIT;

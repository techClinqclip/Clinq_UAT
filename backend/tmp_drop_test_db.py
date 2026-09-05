import psycopg2

url = "postgresql://postgres.ykgxnhdphimjeuwcuclc:Clinq%268908%26@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
conn = psycopg2.connect(url)
conn.autocommit = True
cur = conn.cursor()
cur.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s", ("clinq_test_db",))
cur.execute("DROP DATABASE IF EXISTS clinq_test_db")
print("dropped test db")
cur.close()
conn.close()

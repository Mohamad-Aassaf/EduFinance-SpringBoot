INSERT INTO perfis (
    nome,
    email,
    senha,
    xp,
    nivel,
    avatar_url,
    saldo_virtual,
    criado_em
)
SELECT
    'Usuario ' || gs,
    'usuario' || gs || '@teste.com',
    '$2a$10$dUp4rD.5R6/n6QpE/Uv0reKtr5rD2YF/m9F2t5cI5dJ9Z8lU1G.6.',
    FLOOR(RANDOM() * 5000)::INTEGER,
    FLOOR(RANDOM() * 50 + 1)::INTEGER,
    NULL,
    ROUND((RANDOM() * 1000000)::NUMERIC, 2),
    NOW() - (RANDOM() * INTERVAL '365 days')
FROM generate_series(1, 10000) gs;
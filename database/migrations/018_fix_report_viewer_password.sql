-- Fix password hash for reports@bluemetal.local test account to match Test@1234
UPDATE users
SET password_hash = '$2a$10$sMjXE6h4wF5b9VNpHgA86.EffX2QMLP4mdeUuns9dyrvcNLd9I9Qu'
WHERE email = 'reports@bluemetal.local';

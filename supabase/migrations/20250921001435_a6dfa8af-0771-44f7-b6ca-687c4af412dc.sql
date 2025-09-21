-- Delete existing reviews and start fresh
DELETE FROM reviews;

-- Insert realistic mock reviews for each item (manageable amount)
INSERT INTO reviews (item_id, rating, comment, reviewer_name, reviewer_email, session_id, is_verified, created_at) VALUES

-- High-quality reviews for each item
('c60e7f73-4c72-4068-a2ff-998e21dbdfa8', 5, 'Absolutely stunning! The diamond eyes are mesmerizing and the craftsmanship is incredible.', 'Cat Collector', null, 'session_001', true, now() - interval '5 days'),
('c60e7f73-4c72-4068-a2ff-998e21dbdfa8', 5, 'This is a true treasure! Perfect addition to my collection. Highly recommend!', 'Art Lover', null, 'session_002', true, now() - interval '10 days'),
('c60e7f73-4c72-4068-a2ff-998e21dbdfa8', 4, 'Beautiful piece with amazing detail. Fast shipping and secure packaging.', 'Sarah M.', null, 'session_003', false, now() - interval '15 days'),

('bd149a86-217f-4cc8-b676-3edfed44938c', 5, 'Amazing Border Collie! So intelligent and well-trained. Perfect family dog!', 'Dog Family', null, 'session_004', true, now() - interval '3 days'),
('bd149a86-217f-4cc8-b676-3edfed44938c', 5, 'Best decision ever! This puppy has brought so much joy to our home.', 'Happy Owner', null, 'session_005', true, now() - interval '8 days'),
('bd149a86-217f-4cc8-b676-3edfed44938c', 5, 'Incredible temperament and health. The breeder was professional and caring.', 'Jennifer L.', 'jen@email.com', 'session_006', true, now() - interval '12 days'),

('08de5a69-d40a-471b-a29b-4719d4d997f6', 5, 'These Vinci shoes are incredible! Perfect fit and amazing comfort all day long.', 'Shoe Expert', null, 'session_007', true, now() - interval '2 days'),
('08de5a69-d40a-471b-a29b-4719d4d997f6', 5, 'Best shoes I have ever owned! Quality is outstanding and style is perfect.', 'Fashion Lover', null, 'session_008', true, now() - interval '6 days'),
('08de5a69-d40a-471b-a29b-4719d4d997f6', 4, 'Great quality and fast shipping. Exactly as described and very comfortable.', 'Michael R.', null, 'session_009', false, now() - interval '11 days'),

('37ef17a7-1e11-4319-b2f7-ea53778b41f2', 5, 'This designer bag is absolutely stunning! Perfect size and exceptional quality.', 'Fashion Expert', 'style@email.com', 'session_010', true, now() - interval '1 day'),
('37ef17a7-1e11-4319-b2f7-ea53778b41f2', 5, 'Love this bag! Goes with everything and the leather is buttery soft.', 'Style Queen', null, 'session_011', true, now() - interval '4 days'),
('37ef17a7-1e11-4319-b2f7-ea53778b41f2', 5, 'Investment piece! Worth every penny. Craftsmanship is impeccable.', 'Luxury Buyer', null, 'session_012', true, now() - interval '9 days');

-- Function to add more reviews for all items
CREATE OR REPLACE FUNCTION add_mock_reviews_batch()
RETURNS void AS $$
DECLARE
    item_record RECORD;
    i INTEGER;
    review_comments TEXT[] := ARRAY[
        'Amazing quality! Exceeded all my expectations completely!',
        'Perfect product! Fast shipping and exactly as described.',
        'Outstanding value for money! Highly recommend to everyone!',
        'Incredible quality and attention to detail. Love it!',
        'Best purchase I have made this year! So satisfied!',
        'Fantastic! Great customer service and top-notch quality.',
        'Love it! Perfect and exactly what I was looking for.',
        'Excellent! Fast delivery and great packaging. Very happy!',
        'This is amazing! Better than expected and great value.',
        'Perfect! High quality materials and craftsmanship.'
    ];
    reviewer_names TEXT[] := ARRAY[
        'Sarah Johnson', 'Michael Chen', 'Emma Williams', 'David Rodriguez', 'Lisa Anderson',
        'James Thompson', 'Maria Garcia', 'Robert Kim', 'Jennifer Brown', 'Christopher Lee'
    ];
BEGIN
    -- Add reviews for each item
    FOR item_record IN SELECT id FROM items LOOP
        FOR i IN 1..50 LOOP  -- 50 reviews per item for now
            INSERT INTO reviews (
                item_id, 
                rating, 
                comment, 
                reviewer_name, 
                reviewer_email, 
                session_id, 
                is_verified, 
                created_at
            ) VALUES (
                item_record.id,
                CASE WHEN random() < 0.8 THEN 5 ELSE 4 END, -- 80% 5-star
                review_comments[floor(random() * array_length(review_comments, 1)) + 1],
                reviewer_names[floor(random() * array_length(reviewer_names, 1)) + 1],
                CASE WHEN random() > 0.7 THEN 'customer' || floor(random() * 1000) || '@email.com' ELSE null END,
                'session_' || floor(random() * 100000),
                random() > 0.2, -- 80% verified
                now() - interval '1 day' * floor(random() * 365)
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT add_mock_reviews_batch();

-- Clean up
DROP FUNCTION add_mock_reviews_batch();
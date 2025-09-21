-- Delete existing reviews to prevent duplicates
DELETE FROM reviews;

-- Insert comprehensive mock reviews for all items
INSERT INTO reviews (item_id, rating, comment, reviewer_name, reviewer_email, session_id, is_verified, created_at) VALUES

-- Labrador Retriever Puppy for Sale (30k reviews)
('0296f486-23c1-429e-afbe-4dd0f142eb24', 5, 'Absolutely perfect! My new best friend arrived healthy and happy. The temperament is amazing!', 'Sarah M.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('0296f486-23c1-429e-afbe-4dd0f142eb24', 5, 'Best decision ever! This puppy has brought so much joy to our family. Highly recommend!', 'David L.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('0296f486-23c1-429e-afbe-4dd0f142eb24', 4, 'Beautiful puppy with great personality. Training is going smoothly. Very satisfied!', 'Emma K.', null, 'session_' || generate_random_uuid(), false, now() - interval '1 day' * (random() * 365)),
('0296f486-23c1-429e-afbe-4dd0f142eb24', 5, 'Amazing health and temperament. The seller was very professional and caring.', 'Michael R.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),

-- Vinci shoes (80k reviews)
('08de5a69-d40a-471b-a29b-4719d4d997f6', 5, 'These shoes are incredible! Perfect fit and amazing quality. Worth every penny!', 'Jessica T.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('08de5a69-d40a-471b-a29b-4719d4d997f6', 5, 'Best shoes I have ever owned! Comfortable for all-day wear and stylish too.', 'Carlos M.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('08de5a69-d40a-471b-a29b-4719d4d997f6', 4, 'Great quality and fast shipping. The design is exactly as shown. Love them!', 'Amanda P.', null, 'session_' || generate_random_uuid(), false, now() - interval '1 day' * (random() * 365)),
('08de5a69-d40a-471b-a29b-4719d4d997f6', 5, 'Outstanding craftsmanship and comfort. These shoes exceeded my expectations!', 'Robert W.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),

-- BRUBAKER Rose Bear (50k reviews)
('0959ede7-7035-4472-bb87-aeb416fd3936', 5, 'Perfect anniversary gift! My wife absolutely loved it. Beautiful packaging too!', 'James H.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('0959ede7-7035-4472-bb87-aeb416fd3936', 5, 'So romantic and beautiful! The roses are perfectly preserved. Highly recommend!', 'Lisa C.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('0959ede7-7035-4472-bb87-aeb416fd3936', 4, 'Stunning gift that made her cry happy tears. Quality is excellent and lasting.', 'Mark D.', null, 'session_' || generate_random_uuid(), false, now() - interval '1 day' * (random() * 365)),
('0959ede7-7035-4472-bb87-aeb416fd3936', 5, 'Absolutely gorgeous! The craftsmanship is amazing. Will definitely order again!', 'Rachel B.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),

-- Australian Shepherd Puppy (600k reviews)
('11d908fb-8194-459c-b2ab-1c7d038c154d', 5, 'This puppy is absolutely incredible! Smart, loyal, and so well-behaved. Perfect!', 'Jennifer A.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('11d908fb-8194-459c-b2ab-1c7d038c154d', 5, 'Best companion ever! This breed is amazing with kids and so intelligent.', 'Thomas J.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('11d908fb-8194-459c-b2ab-1c7d038c154d', 5, 'Stunning puppy with perfect temperament. Training has been a breeze!', 'Michelle S.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('11d908fb-8194-459c-b2ab-1c7d038c154d', 4, 'Beautiful and healthy puppy. Great communication from the seller throughout.', 'Kevin G.', null, 'session_' || generate_random_uuid(), false, now() - interval '1 day' * (random() * 365)),

-- Miniature Schnauzer (45k reviews) - Already has reviews, but adding more variety
('13275990-c121-4d4d-8240-1adbde5a2622', 5, 'Perfect family dog! Smart, loyal, and great with children. Highly recommend!', 'Patricia N.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('13275990-c121-4d4d-8240-1adbde5a2622', 5, 'Amazing temperament and so well-trained already. Best purchase ever!', 'Brian F.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),

-- Fashion Makeup Poster Set (35k reviews)
('1b474fa2-260a-4cdb-909b-162f7559c8c8', 5, 'Beautiful artwork! Perfect for my beauty room. The frames are high quality too!', 'Vanessa R.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('1b474fa2-260a-4cdb-909b-162f7559c8c8', 4, 'Love these posters! They brighten up my space and inspire my daily routine.', 'Ashley M.', null, 'session_' || generate_random_uuid(), false, now() - interval '1 day' * (random() * 365)),
('1b474fa2-260a-4cdb-909b-162f7559c8c8', 5, 'Exactly what I was looking for! Great quality printing and stylish frames.', 'Stephanie L.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),

-- Golden Retriever Puppy (30k reviews) - Already has reviews, adding variety
('26fe2e4a-93d2-4b6e-9d7a-4aa9344a9274', 5, 'Wonderful puppy with the sweetest personality! Perfect addition to our family.', 'Daniel K.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('26fe2e4a-93d2-4b6e-9d7a-4aa9344a9274', 5, 'Healthy, happy, and absolutely adorable! Everything went smoothly with delivery.', 'Maria V.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),

-- Polo shirts (120k reviews)
('286190df-cb34-4196-bcb0-48e5fded6733', 5, 'Best polo shirts ever! Perfect fit, great fabric, and the colors are vibrant!', 'Christopher B.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('286190df-cb34-4196-bcb0-48e5fded6733', 4, 'Excellent quality and comfortable fit. Great for both casual and business wear.', 'Nicole H.', null, 'session_' || generate_random_uuid(), false, now() - interval '1 day' * (random() * 365)),
('286190df-cb34-4196-bcb0-48e5fded6733', 5, 'Amazing value for the price! These shirts look and feel premium quality.', 'Alexander C.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('286190df-cb34-4196-bcb0-48e5fded6733', 5, 'Perfect for summer! Breathable fabric and stylish design. Will order more!', 'Samantha T.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),

-- GE Washer (90k reviews)
('2ccd4eae-271b-45e6-93bc-018aa6aad38f', 5, 'This washer is incredible! Cleans perfectly and the smart features are amazing!', 'Linda J.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('2ccd4eae-271b-45e6-93bc-018aa6aad38f', 5, 'Best appliance purchase ever! Efficient, quiet, and the capacity is perfect.', 'Richard M.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('2ccd4eae-271b-45e6-93bc-018aa6aad38f', 4, 'Great washer with modern features. Installation was smooth and it works perfectly.', 'Catherine P.', null, 'session_' || generate_random_uuid(), false, now() - interval '1 day' * (random() * 365)),
('2ccd4eae-271b-45e6-93bc-018aa6aad38f', 5, 'Love the smart dispense feature! Makes laundry so much easier and more efficient.', 'Steven W.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),

-- Designer Bag (250k reviews)
('37ef17a7-1e11-4319-b2f7-ea53778b41f2', 5, 'This bag is absolutely stunning! Perfect size and the quality is outstanding!', 'Isabella F.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('37ef17a7-1e11-4319-b2f7-ea53778b41f2', 5, 'Best handbag I have ever owned! The craftsmanship is impeccable and so stylish!', 'Olivia G.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365)),
('37ef17a7-1e11-4319-b2f7-ea53778b41f2', 4, 'Beautiful bag that goes with everything! Great investment piece for any wardrobe.', 'Sophia R.', null, 'session_' || generate_random_uuid(), false, now() - interval '1 day' * (random() * 365)),
('37ef17a7-1e11-4319-b2f7-ea53778b41f2', 5, 'Exceeded my expectations! The leather is buttery soft and the design is timeless.', 'Emma L.', null, 'session_' || generate_random_uuid(), true, now() - interval '1 day' * (random() * 365));

-- Create function to insert multiple reviews for each item with realistic distribution
CREATE OR REPLACE FUNCTION insert_bulk_reviews()
RETURNS void AS $$
DECLARE
    item_record RECORD;
    review_count INTEGER;
    i INTEGER;
    review_texts TEXT[] := ARRAY[
        'Amazing quality! Exceeded all my expectations. Will definitely buy again!',
        'Perfect product! Fast shipping and exactly as described. Highly recommend!',
        'Outstanding value for money! This has made such a difference in my life.',
        'Incredible quality and attention to detail. Worth every penny!',
        'Best purchase I have made this year! So happy with this product.',
        'Fantastic! Great customer service and the product is top-notch quality.',
        'Love it! Perfect fit and finish. Exactly what I was looking for.',
        'Excellent product! Fast delivery and great packaging. Very satisfied!',
        'This is amazing! Better than I expected and great value for the price.',
        'Perfect! High quality materials and craftsmanship. Highly recommend!',
        'Wonderful experience! The product works perfectly and looks great.',
        'Great buy! Durable, well-made, and exactly as advertised. Love it!',
        'Superb quality! This product has exceeded my expectations completely.',
        'Amazing! Great design and functionality. Would definitely recommend.',
        'Perfect addition to my collection! Quality is outstanding and delivery was fast.'
    ];
    reviewer_names TEXT[] := ARRAY[
        'Sarah Johnson', 'Michael Chen', 'Emma Williams', 'David Rodriguez', 'Lisa Anderson',
        'James Thompson', 'Maria Garcia', 'Robert Kim', 'Jennifer Brown', 'Christopher Lee',
        'Amanda Davis', 'Daniel Martinez', 'Michelle Wilson', 'Kevin Taylor', 'Jessica Moore',
        'Brian Jackson', 'Ashley White', 'Ryan Harris', 'Nicole Clark', 'Justin Lewis',
        'Stephanie Walker', 'Tyler Hall', 'Rachel Allen', 'Brandon Young', 'Melissa King',
        'Jordan Wright', 'Samantha Scott', 'Alexander Green', 'Brittany Adams', 'Nathan Baker'
    ];
BEGIN
    -- Loop through each item
    FOR item_record IN SELECT id FROM items LOOP
        -- Determine random review count between 30k-600k
        review_count := 30000 + floor(random() * 570000)::INTEGER;
        
        -- Insert reviews in batches to avoid memory issues
        FOR i IN 1..LEAST(review_count, 100000) LOOP  -- Cap at 100k per item to avoid timeout
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
                (array[4,4,4,5,5,5,5,5,5,5])[floor(random()*10)+1], -- 70% 5-star, 30% 4-star
                review_texts[floor(random()*array_length(review_texts,1))+1],
                reviewer_names[floor(random()*array_length(reviewer_names,1))+1],
                CASE WHEN random() > 0.7 THEN 'customer' || floor(random()*10000) || '@email.com' ELSE null END,
                'session_' || generate_random_uuid(),
                random() > 0.3, -- 70% verified
                now() - interval '1 day' * (random() * 730) -- Reviews from last 2 years
            );
            
            -- Add some progress tracking and prevent timeouts
            IF i % 1000 = 0 THEN
                RAISE NOTICE 'Inserted % reviews for item %', i, item_record.id;
            END IF;
        END LOOP;
        
        RAISE NOTICE 'Completed % reviews for item %', LEAST(review_count, 100000), item_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to insert all reviews
SELECT insert_bulk_reviews();

-- Drop the function after use
DROP FUNCTION insert_bulk_reviews();
-- Fix review counts to be more realistic and varied
DELETE FROM reviews;

-- Insert varied number of realistic reviews per item
DO $$
DECLARE
    item_record RECORD;
    review_count INTEGER;
    i INTEGER;
    review_comments TEXT[] := ARRAY[
        'Absolutely love this product! Exceeded all my expectations.',
        'Great quality and fast shipping. Highly recommend!',
        'Perfect! Exactly what I was looking for.',
        'Amazing quality for the price. Very satisfied.',
        'Outstanding product and customer service.',
        'This is fantastic! Will definitely buy again.',
        'Excellent purchase. Great value for money.',
        'Love it! Perfect quality and quick delivery.',
        'Incredible product! Better than expected.',
        'Fantastic quality and attention to detail.',
        'Perfect fit and amazing comfort.',
        'Best purchase I''ve made this year!',
        'Great product, fast shipping, excellent service.',
        'Amazing! Worth every penny.',
        'Perfect quality and exactly as described.',
        'Love this! Great craftsmanship.',
        'Excellent product, highly recommended.',
        'Perfect! Great quality and fast delivery.',
        'Outstanding value and quality.',
        'Amazing product! So happy with this purchase.'
    ];
    reviewer_names TEXT[] := ARRAY[
        'Sarah Johnson', 'Michael Chen', 'Emma Williams', 'David Rodriguez', 'Lisa Anderson',
        'James Thompson', 'Maria Garcia', 'Robert Kim', 'Jennifer Brown', 'Christopher Lee',
        'Jessica Martinez', 'Daniel Wilson', 'Ashley Davis', 'Matthew Taylor', 'Amanda Moore',
        'Joshua Jackson', 'Stephanie White', 'Andrew Harris', 'Michelle Lewis', 'Ryan Clark',
        'Rebecca Hall', 'Kevin Allen', 'Lauren Young', 'Justin King', 'Samantha Wright',
        'Brandon Scott', 'Rachel Green', 'Tyler Adams', 'Nicole Baker', 'Jonathan Nelson'
    ];
    varied_counts INTEGER[] := ARRAY[20, 35, 67, 89, 45, 120, 78, 23, 156, 34, 91, 67, 43, 189, 56, 78, 234, 45, 87, 123];
BEGIN
    -- Add varied reviews for each item
    FOR item_record IN SELECT id FROM items LOOP
        -- Get a varied review count (20-234 range)
        review_count := varied_counts[1 + (floor(random() * array_length(varied_counts, 1)))];
        
        FOR i IN 1..review_count LOOP
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
                CASE 
                    WHEN random() < 0.7 THEN 5
                    WHEN random() < 0.9 THEN 4
                    ELSE 3
                END,
                review_comments[1 + floor(random() * array_length(review_comments, 1))],
                reviewer_names[1 + floor(random() * array_length(reviewer_names, 1))],
                CASE WHEN random() > 0.6 THEN 'customer' || floor(random() * 1000) || '@email.com' ELSE null END,
                'session_' || floor(random() * 100000),
                random() > 0.3, -- 70% verified
                now() - interval '1 day' * floor(random() * 365)
            );
        END LOOP;
    END LOOP;
END;
$$;
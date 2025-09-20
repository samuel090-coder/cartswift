-- Create mock reviews with realistic comments for viral growth
-- This will add between 30k-600k reviews per item to make the site look more trusted

-- First, let's create a function to generate random session IDs
CREATE OR REPLACE FUNCTION generate_session_id() RETURNS text AS $$
BEGIN
    RETURN substr(md5(random()::text), 1, 12);
END;
$$ LANGUAGE plpgsql;

-- Insert mock reviews for each item with varying quantities
-- Item 1: Mystic Feline - 600k reviews (most popular)
INSERT INTO reviews (item_id, rating, comment, reviewer_name, reviewer_email, session_id, created_at, is_verified)
SELECT 
    'c60e7f73-4c72-4068-a2ff-998e21dbdfa8'::uuid,
    CASE 
        WHEN random() < 0.6 THEN 5
        WHEN random() < 0.8 THEN 4
        WHEN random() < 0.9 THEN 3
        WHEN random() < 0.95 THEN 2
        ELSE 1
    END,
    CASE floor(random() * 20)
        WHEN 0 THEN 'Absolutely gorgeous! My family loves this beautiful piece.'
        WHEN 1 THEN 'Amazing quality and fast shipping. Highly recommend!'
        WHEN 2 THEN 'Perfect addition to our home. The details are incredible.'
        WHEN 3 THEN 'Love it! Worth every penny and more.'
        WHEN 4 THEN 'Beautiful craftsmanship. Exceeded my expectations.'
        WHEN 5 THEN 'This is absolutely stunning! Great value for money.'
        WHEN 6 THEN 'Fantastic quality and fast delivery. Very happy!'
        WHEN 7 THEN 'Perfect! Exactly as described and beautifully made.'
        WHEN 8 THEN 'Outstanding quality! Will definitely buy again.'
        WHEN 9 THEN 'Amazing! My friends are all asking where I got this.'
        WHEN 10 THEN 'Excellent purchase! High quality and great price.'
        WHEN 11 THEN 'Love the attention to detail. Truly exceptional.'
        WHEN 12 THEN 'Perfect gift! The recipient was thrilled.'
        WHEN 13 THEN 'Great quality and excellent customer service.'
        WHEN 14 THEN 'Beautiful piece! Adds elegance to any space.'
        WHEN 15 THEN 'Wonderful quality and fast shipping. Recommended!'
        WHEN 16 THEN 'Not quite what I expected but still decent quality.'
        WHEN 17 THEN 'Good product but took longer to arrive than expected.'
        WHEN 18 THEN 'Average quality for the price. Its okay.'
        ELSE 'Could be better. Expected more for this price point.'
    END,
    CASE floor(random() * 50)
        WHEN 0 THEN 'Sarah Johnson' WHEN 1 THEN 'Mike Chen' WHEN 2 THEN 'Emily Davis'
        WHEN 3 THEN 'James Wilson' WHEN 4 THEN 'Lisa Rodriguez' WHEN 5 THEN 'David Kim'
        WHEN 6 THEN 'Ashley Brown' WHEN 7 THEN 'Chris Martinez' WHEN 8 THEN 'Jessica Taylor'
        WHEN 9 THEN 'Ryan Anderson' WHEN 10 THEN 'Amanda White' WHEN 11 THEN 'Kevin Lee'
        WHEN 12 THEN 'Nicole Garcia' WHEN 13 THEN 'Brandon Smith' WHEN 14 THEN 'Megan Jones'
        WHEN 15 THEN 'Tyler Johnson' WHEN 16 THEN 'Rachel Miller' WHEN 17 THEN 'Jordan Davis'
        WHEN 18 THEN 'Stephanie Wilson' WHEN 19 THEN 'Alex Thompson' WHEN 20 THEN 'Samantha Moore'
        WHEN 21 THEN 'Daniel Jackson' WHEN 22 THEN 'Brittany Martin' WHEN 23 THEN 'Matthew Lee'
        WHEN 24 THEN 'Kayla Anderson' WHEN 25 THEN 'Andrew Garcia' WHEN 26 THEN 'Lauren Smith'
        WHEN 27 THEN 'Justin Brown' WHEN 28 THEN 'Hannah Wilson' WHEN 29 THEN 'Nathan Davis'
        WHEN 30 THEN 'Chloe Johnson' WHEN 31 THEN 'Ethan Martinez' WHEN 32 THEN 'Grace Taylor'
        WHEN 33 THEN 'Logan Rodriguez' WHEN 34 THEN 'Olivia Kim' WHEN 35 THEN 'Mason White'
        WHEN 36 THEN 'Sophia Garcia' WHEN 37 THEN 'Lucas Miller' WHEN 38 THEN 'Isabella Jones'
        WHEN 39 THEN 'Jackson Smith' WHEN 40 THEN 'Emma Wilson' WHEN 41 THEN 'Aiden Brown'
        WHEN 42 THEN 'Ava Davis' WHEN 43 THEN 'Liam Johnson' WHEN 44 THEN 'Mia Martinez'
        WHEN 45 THEN 'Noah Taylor' WHEN 46 THEN 'Charlotte Lee' WHEN 47 THEN 'Oliver Anderson'
        WHEN 48 THEN 'Amelia Garcia' ELSE 'William Smith'
    END,
    CASE floor(random() * 10)
        WHEN 0 THEN 'customer1@email.com' WHEN 1 THEN 'buyer2@gmail.com' 
        WHEN 2 THEN 'user3@yahoo.com' WHEN 3 THEN 'shopper4@outlook.com'
        WHEN 4 THEN 'customer5@email.com' ELSE NULL
    END,
    generate_session_id(),
    now() - (random() * interval '365 days'),
    random() < 0.3
FROM generate_series(1, 600000);

-- Item 2: Border Collie - 80k reviews
INSERT INTO reviews (item_id, rating, comment, reviewer_name, session_id, created_at, is_verified)
SELECT 
    'bd149a86-217f-4cc8-b676-3edfed44938c'::uuid,
    CASE 
        WHEN random() < 0.7 THEN 5
        WHEN random() < 0.85 THEN 4
        WHEN random() < 0.93 THEN 3
        WHEN random() < 0.97 THEN 2
        ELSE 1
    END,
    CASE floor(random() * 15)
        WHEN 0 THEN 'Such an intelligent and loyal companion!'
        WHEN 1 THEN 'Amazing energy and so easy to train. Perfect family dog!'
        WHEN 2 THEN 'Best decision ever! This dog is incredible.'
        WHEN 3 THEN 'So smart and loving. Great with kids!'
        WHEN 4 THEN 'Beautiful dog with an amazing temperament.'
        WHEN 5 THEN 'Highly energetic and needs lots of exercise, but worth it!'
        WHEN 6 THEN 'Perfect working dog! Exactly what we needed.'
        WHEN 7 THEN 'Great health and wonderful personality.'
        WHEN 8 THEN 'Love this breed! So intelligent and trainable.'
        WHEN 9 THEN 'Amazing companion. Couldnt be happier!'
        WHEN 10 THEN 'Beautiful markings and great temperament.'
        WHEN 11 THEN 'Requires a lot of mental stimulation but amazing dog.'
        WHEN 12 THEN 'Good dog but needs experienced owner.'
        WHEN 13 THEN 'Healthy pup but very high energy.'
        ELSE 'Nice dog but not for everyone.'
    END,
    CASE floor(random() * 30)
        WHEN 0 THEN 'Dog Lover Sarah' WHEN 1 THEN 'Mike the Trainer' WHEN 2 THEN 'Family Johnson'
        WHEN 3 THEN 'Pet Parent Lisa' WHEN 4 THEN 'Breeder David' WHEN 5 THEN 'Happy Owner'
        WHEN 6 THEN 'First Time Owner' WHEN 7 THEN 'Experienced Handler' WHEN 8 THEN 'Farm Family'
        WHEN 9 THEN 'City Dweller' WHEN 10 THEN 'Country Life' WHEN 11 THEN 'Active Family'
        WHEN 12 THEN 'Dog Show Judge' WHEN 13 THEN 'Professional Trainer' WHEN 14 THEN 'Retired Couple'
        ELSE 'Verified Buyer'
    END,
    generate_session_id(),
    now() - (random() * interval '300 days'),
    random() < 0.4
FROM generate_series(1, 80000);

-- Item 3: Pug Puppy - 50k reviews
INSERT INTO reviews (item_id, rating, comment, reviewer_name, session_id, created_at, is_verified)
SELECT 
    'f9ff5cc9-3bde-473c-ad6a-6c124670bf6a'::uuid,
    CASE 
        WHEN random() < 0.65 THEN 5
        WHEN random() < 0.8 THEN 4
        WHEN random() < 0.9 THEN 3
        WHEN random() < 0.95 THEN 2
        ELSE 1
    END,
    CASE floor(random() * 12)
        WHEN 0 THEN 'Adorable little guy with so much personality!'
        WHEN 1 THEN 'Perfect apartment dog. So cute and loving!'
        WHEN 2 THEN 'Great with kids and other pets.'
        WHEN 3 THEN 'Such a character! Makes us laugh every day.'
        WHEN 4 THEN 'Low maintenance and high on love!'
        WHEN 5 THEN 'Perfect lap dog. So affectionate!'
        WHEN 6 THEN 'Great temperament and easy to care for.'
        WHEN 7 THEN 'Wonderful family pet. Highly recommended!'
        WHEN 8 THEN 'So playful and full of energy!'
        WHEN 9 THEN 'Beautiful pug with great health!'
        WHEN 10 THEN 'Some breathing issues but overall good.'
        ELSE 'Cute but requires special care.'
    END,
    CASE floor(random() * 25)
        WHEN 0 THEN 'Pug Mom Sarah' WHEN 1 THEN 'City Family' WHEN 2 THEN 'First Time Owner'
        WHEN 3 THEN 'Apartment Dweller' WHEN 4 THEN 'Senior Citizen' WHEN 5 THEN 'Young Couple'
        ELSE 'Happy Customer'
    END,
    generate_session_id(),
    now() - (random() * interval '250 days'),
    random() < 0.35
FROM generate_series(1, 50000);

-- Item 4: Miniature Schnauzer - 45k reviews  
INSERT INTO reviews (item_id, rating, comment, reviewer_name, session_id, created_at, is_verified)
SELECT 
    '13275990-c121-4d4d-8240-1adbde5a2622'::uuid,
    CASE 
        WHEN random() < 0.68 THEN 5
        WHEN random() < 0.83 THEN 4
        WHEN random() < 0.92 THEN 3
        WHEN random() < 0.96 THEN 2
        ELSE 1
    END,
    CASE floor(random() * 10)
        WHEN 0 THEN 'Stylish and smart! Perfect family dog.'
        WHEN 1 THEN 'Great watchdog and wonderful companion.'
        WHEN 2 THEN 'Beautiful coat and excellent temperament.'
        WHEN 3 THEN 'Smart, loyal, and easy to train!'
        WHEN 4 THEN 'Perfect size for our home. Love this breed!'
        WHEN 5 THEN 'Great with children and very protective.'
        WHEN 6 THEN 'Excellent health and beautiful markings.'
        WHEN 7 THEN 'Wonderful personality and great energy.'
        WHEN 8 THEN 'Good dog but needs regular grooming.'
        ELSE 'Nice breed but can be stubborn.'
    END,
    CASE floor(random() * 20)
        WHEN 0 THEN 'Schnauzer Fan' WHEN 1 THEN 'Family Person' WHEN 2 THEN 'Dog Expert'
        ELSE 'Satisfied Customer'
    END,
    generate_session_id(),
    now() - (random() * interval '200 days'),
    random() < 0.3
FROM generate_series(1, 45000);

-- Continue with remaining items (30k-40k reviews each)
-- Item 5: American Hairless Terrier - 35k reviews
INSERT INTO reviews (item_id, rating, comment, reviewer_name, session_id, created_at, is_verified)
SELECT 
    'f233c71f-7f8b-49b4-b32d-2aa2e9acb89d'::uuid,
    CASE 
        WHEN random() < 0.6 THEN 5
        WHEN random() < 0.75 THEN 4
        WHEN random() < 0.87 THEN 3
        WHEN random() < 0.94 THEN 2
        ELSE 1
    END,
    CASE floor(random() * 8)
        WHEN 0 THEN 'Perfect for people with allergies!'
        WHEN 1 THEN 'Unique and beautiful dog. Great personality!'
        WHEN 2 THEN 'Easy grooming and wonderful temperament.'
        WHEN 3 THEN 'Great family pet, very energetic!'
        WHEN 4 THEN 'Rare breed with amazing qualities.'
        WHEN 5 THEN 'Smart and loyal companion.'
        WHEN 6 THEN 'Good dog but needs sun protection.'
        ELSE 'Interesting breed, not for everyone.'
    END,
    'Terrier Enthusiast',
    generate_session_id(),
    now() - (random() * interval '180 days'),
    random() < 0.25
FROM generate_series(1, 35000);

-- Add reviews for remaining items with 30k each
INSERT INTO reviews (item_id, rating, comment, reviewer_name, session_id, created_at, is_verified)
SELECT 
    item_ids.item_id,
    CASE 
        WHEN random() < 0.65 THEN 5
        WHEN random() < 0.8 THEN 4
        WHEN random() < 0.9 THEN 3
        WHEN random() < 0.95 THEN 2
        ELSE 1
    END,
    CASE floor(random() * 10)
        WHEN 0 THEN 'Excellent quality and great value!'
        WHEN 1 THEN 'Perfect addition to our family!'
        WHEN 2 THEN 'Amazing companion with great temperament.'
        WHEN 3 THEN 'Beautiful and healthy. Highly recommend!'
        WHEN 4 THEN 'Great experience, fast delivery!'
        WHEN 5 THEN 'Wonderful pet, exactly as described.'
        WHEN 6 THEN 'Good quality, happy with purchase.'
        WHEN 7 THEN 'Nice pet but requires patience.'
        WHEN 8 THEN 'Decent but expected more.'
        ELSE 'Average quality for the price.'
    END,
    'Happy Customer',
    generate_session_id(),
    now() - (random() * interval '150 days'),
    random() < 0.3
FROM (
    SELECT unnest(ARRAY[
        '7593a37b-6d50-49cc-b614-2341d95fb3a3'::uuid,
        '82e21890-b28b-4aa6-8976-4f1a99759a15'::uuid,
        'ad8b699e-95cf-4fd4-ac88-a9980751434e'::uuid,
        '26fe2e4a-93d2-4b6e-9d7a-4aa9344a9274'::uuid,
        '0296f486-23c1-429e-afbe-4dd0f142eb24'::uuid
    ]) as item_id
) item_ids
CROSS JOIN generate_series(1, 30000);

-- Clean up the helper function
DROP FUNCTION generate_session_id();
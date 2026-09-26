-- A handful of sample rows so the pipeline can be tried end to end.
-- Usage: mysql -u root -p moviedb < database/seed.sql

INSERT INTO movies (title, overview, genre, release_date, vote_average, poster_url) VALUES
('Inception', 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO.', 'Action, Science Fiction, Adventure', '2010-07-15', 8.4, NULL),
('Spirited Away', 'A young girl wanders into a world ruled by gods, witches and spirits, where humans are changed into beasts.', 'Animation, Family, Fantasy', '2001-07-20', 8.5, NULL),
('Parasite', 'A poor family schemes to become employed by a wealthy family by infiltrating their household.', 'Comedy, Thriller, Drama', '2019-05-30', 8.5, NULL),
('The Dark Knight', 'Batman raises the stakes in his war on crime against a criminal mastermind known as the Joker.', 'Drama, Action, Crime, Thriller', '2008-07-16', 8.5, NULL),
('Heneral Luna', 'General Antonio Luna leads the Philippine army in the Philippine–American War while battling divisions within his own government.', 'History, War, Drama', '2015-09-09', 7.3, NULL),
('Coco', 'Aspiring musician Miguel is transported to the Land of the Dead to find his great-great-grandfather.', 'Family, Animation, Fantasy, Music', '2017-10-27', 8.2, NULL);

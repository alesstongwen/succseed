-- Allow propagations without a parent plant in the user's collection
-- (e.g. cuttings taken from street trees or a friend's plant)
alter table propagations alter column plant_id drop not null;
alter table propagations add column if not exists source_species text;

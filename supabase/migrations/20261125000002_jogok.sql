-- A szerveroldali szerep (service_role: a `submit` függvény) hozzáférése a táblákhoz. Az újabb Supabase-projektekben az új táblák
-- nem kapnak automatikusan jogot; a böngésző (anon, authenticated) továbbra sem fér hozzájuk közvetlenül (sorszintű jogosultság, szabály nélkül).
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;

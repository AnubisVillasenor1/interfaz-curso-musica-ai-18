-- 20261105190400_refund_grant.sql
-- Si las migraciones 190000-190300 ya se aplicaron sin el grant de
-- refund_generation_quota, esta migración lo otorga sin re-ejecutar historia.
-- En instalaciones limpias es un no-op idempotente (grant sobre función ya
-- habilitada).

grant execute on function public.refund_generation_quota(uuid, text) to authenticated;

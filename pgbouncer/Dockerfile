FROM edoburu/pgbouncer:latest
COPY --chown=postgres:postgres pgbouncer.ini /etc/pgbouncer/pgbouncer.ini
COPY --chown=postgres:postgres userlist.txt /etc/pgbouncer/userlist.txt
COPY --chmod=755 entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

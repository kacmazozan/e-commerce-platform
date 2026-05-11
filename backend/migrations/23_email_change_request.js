exports.up = (pgm) => {
  pgm.addColumns(
    { schema: 'auth', name: 'users' },
    {
      pending_email: { type: 'varchar(255)' },
      email_change_old_token_hash: { type: 'varchar(64)' },
      email_change_new_token_hash: { type: 'varchar(64)' },
      email_change_old_confirmed_at: { type: 'timestamptz' },
      email_change_new_confirmed_at: { type: 'timestamptz' },
      email_change_expires_at: { type: 'timestamptz' },
    }
  )

  pgm.sql(`
    CREATE UNIQUE INDEX users_pending_email_idx
      ON auth.users (lower(pending_email))
      WHERE pending_email IS NOT NULL
  `)
  pgm.sql(`
    CREATE UNIQUE INDEX users_email_change_old_token_hash_idx
      ON auth.users (email_change_old_token_hash)
      WHERE email_change_old_token_hash IS NOT NULL
  `)
  pgm.sql(`
    CREATE UNIQUE INDEX users_email_change_new_token_hash_idx
      ON auth.users (email_change_new_token_hash)
      WHERE email_change_new_token_hash IS NOT NULL
  `)
}

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS auth.users_email_change_new_token_hash_idx')
  pgm.sql('DROP INDEX IF EXISTS auth.users_email_change_old_token_hash_idx')
  pgm.sql('DROP INDEX IF EXISTS auth.users_pending_email_idx')
  pgm.dropColumns({ schema: 'auth', name: 'users' }, [
    'pending_email',
    'email_change_old_token_hash',
    'email_change_new_token_hash',
    'email_change_old_confirmed_at',
    'email_change_new_confirmed_at',
    'email_change_expires_at',
  ])
}

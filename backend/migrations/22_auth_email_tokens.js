exports.up = (pgm) => {
  pgm.addColumns(
    { schema: 'auth', name: 'users' },
    {
      email_verified_at: { type: 'timestamptz' },
      email_verification_token_hash: { type: 'varchar(64)' },
      email_verification_expires_at: { type: 'timestamptz' },
      password_reset_token_hash: { type: 'varchar(64)' },
    }
  )

  pgm.dropColumn({ schema: 'auth', name: 'users' }, 'reset_token')

  pgm.sql('UPDATE auth.users SET email_verified_at = NOW() WHERE email_verified_at IS NULL')
  pgm.sql(`
    CREATE UNIQUE INDEX users_email_verification_token_hash_idx
      ON auth.users (email_verification_token_hash)
      WHERE email_verification_token_hash IS NOT NULL
  `)
  pgm.sql(`
    CREATE UNIQUE INDEX users_password_reset_token_hash_idx
      ON auth.users (password_reset_token_hash)
      WHERE password_reset_token_hash IS NOT NULL
  `)
}

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS auth.users_password_reset_token_hash_idx')
  pgm.sql('DROP INDEX IF EXISTS auth.users_email_verification_token_hash_idx')

  pgm.addColumns({ schema: 'auth', name: 'users' }, { reset_token: { type: 'varchar(255)' } })
  pgm.dropColumns({ schema: 'auth', name: 'users' }, [
    'email_verified_at',
    'email_verification_token_hash',
    'email_verification_expires_at',
    'password_reset_token_hash',
  ])
}

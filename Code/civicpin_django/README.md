# CivicPin — Django

The complete CivicPin platform in Python: Django 5.2 + Django REST Framework
serving both the JSON API and the web pages. This replaces the previous
Node/Express backend and Next.js frontend.

## Quick start

```bash
cd Code/civicpin_django
python -m venv ../.venv
../.venv/Scripts/python.exe -m pip install -r requirements.txt   # Windows
# source ../.venv/bin/activate && pip install -r requirements.txt  # macOS/Linux

cp .env.example .env          # then fill in the keys you have
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver
```

Open <http://localhost:8000>. The seed command prints the demo credentials
(`asha@example.com` / `civicpin123`).

Create an admin account for <http://localhost:8000/admin/>:

```bash
python manage.py createsuperuser
```

## Layout

| Path | What lives there |
| --- | --- |
| `civicpin/` | Settings, root URL conf, WSGI/ASGI entry points |
| `accounts/` | Custom `User` model, JWT cookie auth, OTP, Google Sign-In |
| `demands/` | Demand model, proximity search, upvotes, comments, AI analysis |
| `properties/` | Property listings |
| `ratings/` | Customer reviews |
| `web/` | Server-rendered pages, context processor, `seed_demo_data` |
| `templates/` | Django templates (one per page, plus `base.html` and includes) |
| `static/` | CSS and the per-page JavaScript modules |
| `uploads/` | User-uploaded avatars (served at `/uploads/`) |

## API

Every route keeps the exact path the Express backend served, so existing
clients work unchanged.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/` | — | Metadata |
| GET | `/healthz` | — | Liveness/readiness probe (`200` when the database answers) |
| POST | `/api/auth/sendOTP` | — | Email a 6-digit signup code |
| POST | `/api/auth/verifyOTP` | — | Check the code, mark the address verified |
| POST | `/api/auth/signup` | — | Create an account (multipart, `profilePhoto` optional) |
| POST | `/api/auth/login` | — | Password login; sets the `civicpin_token` cookie |
| POST | `/api/auth/google` | — | Exchange a Google ID token for a session |
| GET | `/api/auth/verify` | — | Report whether the caller's token is valid |
| POST | `/api/auth/logout` | — | Clear the cookie and session |
| GET | `/api/user/profile` | ✔ | Current user, their demands, listings and activity |
| POST | `/api/demand/demand` | ✔ | Create a demand |
| GET | `/api/demand/getDemand` | — | All demands (`?category=` to filter) |
| GET | `/api/demand/getDemandById/<id>` | — | One demand |
| GET | `/api/demand/nearby` | — | `?latitude=&longitude=&radius=` (metres, default 5000) |
| PATCH | `/api/demand/<id>/upvote` | ✔ | Toggle the caller's upvote |
| POST | `/api/demand/<id>/comments` | ✔ | Add a comment |
| GET | `/api/demand/<id>/analysis` | — | Gemini feasibility analysis (cached 6h) |
| POST | `/api/property/property` | ✔ | Create a listing |
| GET | `/api/property/getProperty` | — | All listings (`?category=`, `?type=`) |
| GET | `/api/property/getPropertyById/<id>` | — | One listing |
| GET | `/api/property/nearby` | — | Proximity search over listings |
| POST | `/api/rating/rating` | — | Create or update the review for an email |
| GET | `/api/rating/reviews` | — | All reviews, newest first |

Authenticated endpoints accept the `civicpin_token` cookie, an
`x-auth-token` header, an `Authorization: Bearer <jwt>` header, or a Django
session.

### Paging, limits and rate limiting

* List endpoints (`getDemand`, `nearby`, `getProperty`, properties `nearby`,
  `reviews`) return up to `API_DEFAULT_PAGE_SIZE` rows. Page with
  `?limit=&offset=`; the unpaged size is in the `X-Total-Count` header.
* `nearby` validates its inputs (finite numbers, valid coordinates, positive
  radius) and clamps the radius to `API_MAX_RADIUS_M`.
* Public review lists mask email addresses (`jo***@example.com`).
* Throttled requests get `429` with `{"error": ..., "retryAfter": seconds}`.
  Budgets (per client address, or per user for writes): OTP send 5/min and
  per mailbox, OTP verify 15/min, login/signup 20/min, AI analysis 20/min,
  writes 60/min — all overridable via `THROTTLE_*`. A code is discarded after
  `OTP_MAX_ATTEMPTS` wrong guesses.

## Configuration

All settings come from the environment, optionally via `.env`. See
`.env.example` for the full list; the ones that matter most:

| Variable | Effect when unset |
| --- | --- |
| `DJANGO_SECRET_KEY` | Insecure development default under `DEBUG`; **startup fails** when `DEBUG` is off |
| `DJANGO_DEBUG` | Defaults to `True` — set `False` in production |
| `DATABASE_URL` | SQLite at `db.sqlite3`; set a `postgres://` URL for Postgres |
| `JWT_SECRET` | A separate key is derived from `DJANGO_SECRET_KEY` (set your own, ≥32 bytes, to rotate independently) |
| `REDIS_URL` | Per-process memory cache; set it when running more than one worker |
| `GOOGLE_MAPS_API_KEY` | Maps are disabled; pages say so and lists still work |
| `GOOGLE_CLIENT_ID` | The "Sign in with Google" button is hidden |
| `GEMINI_API_KEY` | The AI analysis panel says it is not configured |
| `RESEND_API_KEY` | Development accepts the fixed OTP `123456`; production refuses to issue one |

## Differences from the Node/Next.js original

These are deliberate, and each one is a correctness or security improvement:

- **The Gemini key stays on the server.** The old frontend called Gemini from
  the browser with `NEXT_PUBLIC_GEMINI_API_KEY`, handing the key to every
  visitor. Analysis now runs in `demands/ai.py` behind
  `/api/demand/<id>/analysis`, and results are cached per demand.
- **Vote totals are recomputed, not incremented.** `Demand.toggle_upvote`
  counts the join table, so a stored total cannot drift out of step with the
  set of voters the way the `+= 1` / `-= 1` version could.
- **Proximity search uses a haversine distance in SQL**, replacing Mongo's
  `$near` + 2dsphere index. Results are ordered nearest-first and annotated
  with a `distance` in metres. No PostGIS or GDAL install is required.
- **One database, one connection.** The original opened four separate Mongo
  connections and rebuilt its models on every call; relations between users,
  demands and properties are now real foreign keys.
- **Passwords use Django's hasher** (PBKDF2 by default) instead of bcrypt
  with a hard-coded cost, and OTP codes come from `secrets`, not `Math.random`.
- **`down_votes` is gone.** The old UI displayed it but no schema or endpoint
  ever produced it, so it always rendered as `undefined`. The detail page now
  shows the comment count in that slot.
- **The globe is plain Three.js.** globe.gl needed its own copy of Three, which
  the original code had already hit as a runtime crash; drawing the globe
  directly keeps a single Three instance by construction.

## Tests

```bash
python manage.py test
```

142 tests cover the auth and OTP flows, token handling, Google sign-in, demand
and property CRUD, distance maths, upvote toggling, comments, the AI endpoint
(mocked), reviews, every page, and the seed command.

## Production

```bash
export DJANGO_DEBUG=False
export DJANGO_SECRET_KEY='...'
export DJANGO_ALLOWED_HOSTS='your-domain.com'
python manage.py collectstatic --noinput   # must run with DEBUG=False
python manage.py migrate
gunicorn civicpin.wsgi:application --bind 0.0.0.0:8000 --workers 3
```

`collectstatic` has to run with `DEBUG=False`: that is the mode that writes the
hashed-filename manifest WhiteNoise serves from, and a manifest built in debug
mode makes every page 500 in production.

With `DEBUG=False`, HTTPS redirects and HSTS turn on by default. If something
else already terminates TLS, set `SECURE_SSL_REDIRECT=False` and
`SECURE_HSTS_SECONDS=0`. `manage.py check --deploy` also suggests
`SECURE_HSTS_INCLUDE_SUBDOMAINS` and `SECURE_HSTS_PRELOAD`; both are left off
because they are hard to reverse — enable them only once every subdomain is
HTTPS-only.

### Front-end CSS

Tailwind is compiled ahead of time into `static/css/tailwind.css` (committed).
After adding new utility classes, rebuild it — see `tailwind/README.md`. CI
fails if the committed file is stale.

### Docker

```bash
docker compose up --build        # from the CivicPin/ directory
```

Brings up the app on port 8000 with PostgreSQL behind it.

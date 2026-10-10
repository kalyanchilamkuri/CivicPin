# Legacy Node.js / Next.js implementation (superseded)

This directory holds the original CivicPin stack:

- `civicpin_backend/` — Express + Mongoose API
- `civicpin_frontend/` — Next.js 15 frontend

**Nothing here runs any more.** The whole application was ported to Django and
now lives in [`../civicpin_django`](../civicpin_django) — that project
serves both the JSON API (at the same URL paths) and the web pages.

It is kept rather than deleted because it carried uncommitted local changes at
the time of the port. Once you have confirmed the Django version does
everything you need, this directory can be removed:

```sh
rm -rf Code/legacy_nodejs
```

`node_modules/` and `.next/` are included in the move and account for almost
all of its size; deleting just those two is a safe first step if you want the
source history nearby but the disk space back.

## Where things went

| Old file | Django equivalent |
| --- | --- |
| `civicpin_backend/server.js` | `civicpin/settings.py`, `civicpin/urls.py` |
| `config/db.js` | `DATABASES` in `civicpin/settings.py` |
| `models/User.js` | `accounts/models.py` |
| `models/demandModel.js` | `demands/models.py` |
| `models/propertyModel.js` | `properties/models.py` |
| `models/ratings.js` | `ratings/models.py` |
| `controllers/authController.js` | `accounts/views.py`, `accounts/otp.py`, `accounts/tokens.py` |
| `controllers/demandController.js` | `demands/views.py` |
| `controllers/propertyController.js` | `properties/views.py` |
| `routes/*.js` | each app's `urls.py` |
| `middlewares/authMiddleware.js` | `accounts/authentication.py` |
| `middlewares/validation.js` | the DRF serializers in each app |
| `middlewares/multerConfig.js` | `ImageField` + `MEDIA_ROOT` |
| `civicpin_frontend/app/**/page.*` | `templates/web/*.html` + `static/js/*.js` |
| `app/components/*` | `templates/includes/*` and the per-page scripts |
| client-side Gemini call in `viewrequest` | `demands/ai.py` behind `/api/demand/<id>/analysis` |

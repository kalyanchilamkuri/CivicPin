"""Authentication backend that treats the email address as the username."""

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

UserModel = get_user_model()


class EmailBackend(ModelBackend):
    """Authenticate against `User.email`, case-insensitively.

    Google-provisioned accounts have no usable password, so `check_password`
    rejects them here and they must go through the Google Sign-In flow.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        email = username or kwargs.get('email')
        if email is None or password is None:
            return None

        try:
            user = UserModel.objects.get(email__iexact=email.strip())
        except UserModel.DoesNotExist:
            # Run the default hasher once to keep timing consistent.
            UserModel().set_password(password)
            return None
        except UserModel.MultipleObjectsReturned:  # pragma: no cover
            user = (
                UserModel.objects.filter(email__iexact=email.strip())
                .order_by('id')
                .first()
            )
            if user is None:
                return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

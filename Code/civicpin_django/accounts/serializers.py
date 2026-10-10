"""Serializers for the accounts API.

The output shape intentionally matches the JSON the previous Express backend
returned (`id`, `profile_image`, `createdAt`, ...) so existing clients keep
working.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

UserModel = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    profile_image = serializers.CharField(
        source='profile_image_url', read_only=True
    )
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = UserModel
        fields = [
            'id',
            'name',
            'email',
            'phone',
            'address',
            'gender',
            'age',
            'profile_image',
            'role',
            'auth_provider',
            'createdAt',
            'updatedAt',
        ]
        read_only_fields = fields


class ProfileSerializer(UserSerializer):
    """Profile payload, with the related objects the profile page shows."""

    demands_raised = serializers.SerializerMethodField()
    properties_created = serializers.SerializerMethodField()
    recentActivity = serializers.SerializerMethodField()

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + [
            'demands_raised',
            'properties_created',
            'recentActivity',
        ]
        read_only_fields = fields

    def get_demands_raised(self, obj):
        from demands.serializers import DemandSerializer

        return DemandSerializer(obj.demands.all(), many=True).data

    def get_properties_created(self, obj):
        from properties.serializers import PropertySerializer

        return PropertySerializer(obj.properties.all(), many=True).data

    def get_recentActivity(self, obj):
        """A merged, newest-first feed of the user's demands and listings."""
        events = []
        for demand in obj.demands.all()[:10]:
            events.append(
                {
                    'action': 'Raised a demand',
                    'description': demand.title,
                    'timestamp': demand.created_at,
                    'url': f'/viewrequest?id={demand.pk}',
                }
            )
        for prop in obj.properties.all()[:10]:
            events.append(
                {
                    'action': 'Listed a property',
                    'description': prop.title,
                    'timestamp': prop.created_at,
                    'url': '/property',
                }
            )

        events.sort(key=lambda event: event['timestamp'], reverse=True)
        for event in events:
            event['timestamp'] = event['timestamp'].strftime('%d %b %Y, %H:%M')
        return events[:10]


class SignupSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    phone = serializers.CharField(
        max_length=32, required=False, allow_blank=True, default=''
    )
    address = serializers.CharField(
        max_length=255, required=False, allow_blank=True, default=''
    )
    gender = serializers.ChoiceField(
        choices=['Male', 'Female', 'Other'],
        required=False,
        allow_blank=True,
        default='',
    )
    age = serializers.IntegerField(
        required=False, allow_null=True, min_value=1, max_value=120
    )
    profilePhoto = serializers.ImageField(required=False, allow_null=True)

    def validate_email(self, value):
        value = value.strip().lower()
        if UserModel.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('User already exists')
        return value

    def validate_age(self, value):
        # The signup form posts an empty string when age is left blank.
        return value or None

    def create(self, validated_data):
        photo = validated_data.pop('profilePhoto', None)
        password = validated_data.pop('password')

        user = UserModel.objects.create_user(
            password=password,
            auth_provider=UserModel.AUTH_LOCAL,
            **validated_data,
        )

        if photo:
            # Saved after creation so the file is named after the user's id,
            # matching the original backend's `<id><ext>` convention.
            user.profile_image = photo
            user.save(update_fields=['profile_image', 'updated_at'])

        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class EmailSerializer(serializers.Serializer):
    email = serializers.EmailField()


class VerifyOtpSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=10)


class GoogleCredentialSerializer(serializers.Serializer):
    credential = serializers.CharField()

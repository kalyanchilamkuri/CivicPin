/* Review form: star picker plus submission. Ports app/rating/page.js. */

(function () {
  'use strict';

  const { api, toast, config } = window.CI;

  const form = document.getElementById('review-form');
  const emailInput = document.getElementById('review-email');
  const reviewInput = document.getElementById('review-text');
  const submitButton = document.getElementById('review-submit');
  const errorEl = document.getElementById('form-error');
  const successEl = document.getElementById('form-success');
  const starButtons = Array.from(document.querySelectorAll('.star-button'));

  let rating = config.existingRating || 0;

  function paintStars(value) {
    starButtons.forEach((button) => {
      const starValue = Number(button.dataset.value);
      const path = button.querySelector('svg');
      path.setAttribute('fill', starValue <= value ? 'gold' : 'none');
      button.setAttribute('aria-checked', starValue === value ? 'true' : 'false');
    });
  }

  starButtons.forEach((button) => {
    button.addEventListener('click', () => {
      rating = Number(button.dataset.value);
      paintStars(rating);
    });
    button.addEventListener('mouseenter', () =>
      paintStars(Number(button.dataset.value))
    );
    button.addEventListener('mouseleave', () => paintStars(rating));
  });

  paintStars(rating);

  function show(el, message) {
    el.textContent = message;
    el.classList.toggle('hidden', !message);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    show(errorEl, '');
    show(successEl, '');

    const review = reviewInput.value.trim();

    // Signed-in users post under their account address; guests type one, and
    // the old frontend's localStorage value is used as a convenience default.
    let email = '';
    if (config.currentUser) {
      email = config.currentUser.email;
    } else if (emailInput) {
      email = emailInput.value.trim();
      if (!email) {
        try {
          email = window.localStorage.getItem('email') || '';
          emailInput.value = email;
        } catch (err) {
          /* private mode */
        }
      }
    }

    if (!email) {
      show(errorEl, 'Please provide your email address.');
      return;
    }
    if (!review || rating === 0) {
      show(errorEl, 'Please provide a review and select a rating.');
      return;
    }

    submitButton.disabled = true;
    const idleLabel = submitButton.textContent;
    submitButton.textContent = 'Submitting...';

    try {
      const data = await api.post(config.urls.ratings + 'rating', {
        email: email,
        review: review,
        rating: rating,
      });

      show(successEl, data.message || 'Review submitted successfully!');
      toast.success(data.message || 'Review submitted successfully!');
      window.setTimeout(() => {
        window.location.href = '/';
      }, 1200);
    } catch (error) {
      show(
        errorEl,
        error.message || 'Failed to submit the review. Please try again.'
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = idleLabel;
    }
  });
})();

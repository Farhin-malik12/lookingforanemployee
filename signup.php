<?php
declare(strict_types=1);

/**
 * signup.php — front-end only. No account is created here.
 *
 * Wire your own backend in the marked spot below. To show a problem, add a
 * message to $errors under the field's key: 'email', 'mobile', 'password',
 * 'confirm', or 'form' for a message that isn't about one field.
 * Passwords are never echoed back into the page.
 */

$errors = [];   // e.g. $errors['email'] = 'An account with this email already exists.';
$email  = '';
$mobile = '';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $email  = trim((string) ($_POST['email'] ?? ''));
    $mobile = trim((string) ($_POST['mobile'] ?? ''));

    // ---- NO DATABASE: just check the fields, then continue ------------------
    $password = (string) ($_POST['password'] ?? '');
    $confirm  = (string) ($_POST['confirm'] ?? '');

    if ($email === '' || $mobile === '' || $password === '' || $password !== $confirm) {
        $errors['form'] = 'Please fill every field and make sure both passwords match.';
    } else {
        session_start();
        session_regenerate_id(true);
        $_SESSION['logged_in'] = true;
        header('Location: role.php');
        exit;
    }
    // ------------------------------------------------------------------------
}

if (!function_exists('e')) {
    function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}

$firstError = $errors === [] ? null : array_key_first($errors);

// Small helpers so the markup below stays readable.
$invalid = static fn (string $key): string => isset($errors[$key]) ? 'true' : 'false';
$hidden  = static fn (string $key): string => isset($errors[$key]) ? '' : 'hidden';
$message = static fn (string $key): string => e($errors[$key] ?? '');
$focus   = static fn (string $key): string => $firstError === $key ? ' data-focus-on-load' : '';
$appName = 'Appname'; // replace with your product name
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>Create account · <?= e($appName) ?></title>
  <link rel="stylesheet" href="auth.css">
</head>

<body>
  <div class="shell">
    <aside class="panel">
      <p class="brand"><span class="mark" aria-hidden="true"></span><?= e($appName) ?></p>
      <p class="tagline">Create your account and get started.</p>
      <div class="art" aria-hidden="true">
        <span class="s s1"></span>
        <span class="s s2"></span>
        <span class="s s3"></span>
        <span class="s s4"></span>
        <span class="s s5"></span>
      </div>
    </aside>

    <main class="pane">
      <div class="form-wrap">
        <h1>Create account</h1>
        <p class="lede">It takes a minute. All fields are required.</p>

        <?php if (isset($errors['form'])): ?>
          <p class="error" id="form-error" role="alert" tabindex="-1"<?= $focus('form') ?>><?= $message('form') ?></p>
        <?php endif; ?>

        <form method="post" action="" novalidate data-validate>
          <div class="field">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value="<?= e($email) ?>"
              autocomplete="email"
              inputmode="email"
              autocapitalize="none"
              spellcheck="false"
              required
              data-field
              data-msg-missing="Enter your email address."
              data-msg-invalid="Enter a valid email address, like name@example.com."
              aria-invalid="<?= $invalid('email') ?>"
              aria-describedby="email-error"<?= $focus('email') ?>
            >
            <p class="field-error" id="email-error" <?= $hidden('email') ?>><?= $message('email') ?></p>
          </div>

          <div class="field">
            <label for="mobile">Mobile number</label>
            <input
              type="tel"
              id="mobile"
              name="mobile"
              value="<?= e($mobile) ?>"
              autocomplete="tel"
              inputmode="tel"
              required
              data-field
              data-msg-missing="Enter your mobile number."
              data-msg-invalid="Enter a valid mobile number with 7 to 15 digits."
              aria-invalid="<?= $invalid('mobile') ?>"
              aria-describedby="mobile-hint mobile-error"<?= $focus('mobile') ?>
            >
            <p class="hint" id="mobile-hint">Include your country code, like +44 7700 900123.</p>
            <p class="field-error" id="mobile-error" <?= $hidden('mobile') ?>><?= $message('mobile') ?></p>
          </div>

          <div class="field">
            <label for="password">Password</label>
            <div class="password-wrap">
              <input
                type="password"
                id="password"
                name="password"
                autocomplete="new-password"
                required
                data-field
                data-minlength="8"
                data-msg-missing="Enter a password."
                data-msg-short="Use at least 8 characters."
                aria-invalid="<?= $invalid('password') ?>"
                aria-describedby="password-hint password-error"<?= $focus('password') ?>
              >
              <button type="button" class="toggle" data-toggle-password data-name="password"
                      aria-controls="password" aria-label="Show password" hidden>Show</button>
            </div>
            <p class="hint" id="password-hint">At least 8 characters.</p>
            <p class="field-error" id="password-error" <?= $hidden('password') ?>><?= $message('password') ?></p>
          </div>

          <div class="field">
            <label for="confirm">Confirm password</label>
            <div class="password-wrap">
              <input
                type="password"
                id="confirm"
                name="confirm"
                autocomplete="new-password"
                required
                data-field
                data-match="password"
                data-msg-missing="Enter your password again."
                data-msg-mismatch="Passwords don't match."
                aria-invalid="<?= $invalid('confirm') ?>"
                aria-describedby="confirm-error"<?= $focus('confirm') ?>
              >
              <button type="button" class="toggle" data-toggle-password data-name="confirm password"
                      aria-controls="confirm" aria-label="Show confirm password" hidden>Show</button>
            </div>
            <p class="field-error" id="confirm-error" <?= $hidden('confirm') ?>><?= $message('confirm') ?></p>
          </div>

          <button type="submit" class="submit">Create account</button>
        </form>

        <p class="alt">Already have an account? <a href="login.php">Sign in</a></p>
      </div>
    </main>
  </div>

  <script src="auth.js"></script>
</body>
</html>

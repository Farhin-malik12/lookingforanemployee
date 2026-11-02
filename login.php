<?php
declare(strict_types=1);

/**
 * login.php — static-password login (no database).
 *
 * Wire your own backend in the marked spot below. The page already knows how to
 * show an error and keep the typed username/email after a failed attempt.
 * The password is never echoed back into the page.
 */

$error      = null; // e.g. 'The username or password is incorrect.'
$identifier = '';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $identifier = trim((string) ($_POST['identifier'] ?? ''));

    // ---- STATIC LOGIN (no database) ----------------------------------------
    // Any non-empty username/email works. Only the password is fixed.
    $STATIC_PASSWORD = 'Welcome@123'; // <- change this to your own password

    if ($identifier !== '' && hash_equals($STATIC_PASSWORD, (string) ($_POST['password'] ?? ''))) {
        session_start();
        session_regenerate_id(true);
        $_SESSION['logged_in'] = true;
        header('Location: role.php');
        exit;
    }
    $error = 'The username or password is incorrect.';
    // ------------------------------------------------------------------------
}

if (!function_exists('e')) {
    function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}

$errorId = 'form-error';
$appName = 'Appname'; // replace with your product name
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>Sign in · <?= e($appName) ?></title>
  <link rel="stylesheet" href="auth.css">
</head>

<body>
  <div class="shell">
    <aside class="panel">
      <p class="brand"><span class="mark" aria-hidden="true"></span><?= e($appName) ?></p>
      <p class="tagline">Pick up where you left off.</p>
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
        <h1>Sign in</h1>
        <p class="lede">Use your username or email and password.</p>

        <?php if ($error !== null): ?>
          <p class="error" id="<?= e($errorId) ?>" role="alert" tabindex="-1" data-focus-on-load><?= e($error) ?></p>
        <?php endif; ?>

        <form method="post" action="" novalidate>
          <div class="field">
            <label for="identifier">Username or email</label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              value="<?= e($identifier) ?>"
              autocomplete="username"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              required
              <?php if ($error !== null): ?>aria-invalid="true" aria-describedby="<?= e($errorId) ?>"<?php endif; ?>
            >
          </div>

          <div class="field">
            <label for="password">Password</label>
            <div class="password-wrap">
              <input
                type="password"
                id="password"
                name="password"
                autocomplete="current-password"
                required
                <?php if ($error !== null): ?>aria-invalid="true" aria-describedby="<?= e($errorId) ?>"<?php endif; ?>
              >
              <!-- Hidden until JS runs, so no-JS users never meet a dead control -->
              <button type="button" class="toggle" data-toggle-password
                      aria-controls="password" aria-label="Show password" hidden>Show</button>
            </div>
          </div>

          <div class="row">
            <label class="check" for="remember">
              <input type="checkbox" id="remember" name="remember" value="1">
              Keep me signed in
            </label>
            <a href="forgot-password.php">Forgot password?</a>
          </div>

          <button type="submit" class="submit">Sign in</button>
        </form>

        <p class="alt">New here? <a href="signup.php">Create an account</a></p>
      </div>
    </main>
  </div>

  <script src="auth.js"></script>
</body>
</html>

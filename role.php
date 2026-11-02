<?php
declare(strict_types=1);
session_start();

if (empty($_SESSION['logged_in'])) {
    header('Location: login.php');
    exit;
}

/**
 * role.php — shown right after a successful login or sign-up.
 * Front-end only: it just records the choice in the session.
 */

$appName = 'Appname'; // replace with your product name
$notice  = null;
$isError = false;

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $role = (string) ($_POST['role'] ?? '');

    if ($role === 'seeker' || $role === 'employer') {
        $_SESSION['role'] = $role;

        if ($role === 'employer') {
            header('Location: employer.php');
            exit;
        }
        $notice = 'The job seeker side is coming soon. Choose "Looking for an Employee" to continue.';
    } else {
        $notice  = 'Choose one option to continue.';
        $isError = true;
    }
}

function e(string $v): string { return htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

$selected = (string) ($_SESSION['role'] ?? '');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>Choose your role · <?= e($appName) ?></title>
  <link rel="stylesheet" href="auth.css">
</head>
<body>
  <div class="shell">
    <aside class="panel">
      <p class="brand"><span class="mark" aria-hidden="true"></span><?= e($appName) ?></p>
      <p class="tagline">Find your next role, or your next hire.</p>
      <div class="art" aria-hidden="true">
        <span class="s s1"></span><span class="s s2"></span><span class="s s3"></span><span class="s s4"></span><span class="s s5"></span>
      </div>
    </aside>

    <main class="pane">
      <div class="form-wrap">
        <h1>What brings you here?</h1>
        <p class="lede">Pick one to continue.</p>

        <?php if ($notice !== null): ?>
          <p class="notice" role="<?= $isError ? 'alert' : 'status' ?>"><?= e($notice) ?></p>
        <?php endif; ?>

        <form method="post" action="">
          <fieldset>
            <legend class="sr">Choose your role</legend>

            <label class="choice">
              <input type="radio" name="role" value="seeker" required<?= $selected === 'seeker' ? ' checked' : '' ?>>
              <span class="choice-body">
                <strong>Looking for a Job</strong>
                <span>Browse openings and apply.</span>
              </span>
            </label>

            <label class="choice">
              <input type="radio" name="role" value="employer" required<?= $selected === 'employer' ? ' checked' : '' ?>>
              <span class="choice-body">
                <strong>Looking for an Employee</strong>
                <span>Post jobs and find candidates.</span>
              </span>
            </label>
          </fieldset>

          <button type="submit" class="submit">Continue</button>
        </form>
      </div>
    </main>
  </div>
</body>
</html>

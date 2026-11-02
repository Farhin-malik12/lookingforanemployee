<?php
declare(strict_types=1);
session_start();
if (empty($_SESSION['logged_in'])) {
    header('Location: login.php');
    exit;
}
$appName = 'Appname'; // replace with your product name
function e(string $v): string { return htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light dark">
  <title>Employer · <?= e($appName) ?></title>
  <link rel="stylesheet" href="auth.css">
  <link rel="stylesheet" href="employer.css">
</head>
<body>
  <div class="app">
    <main id="view" aria-live="off"><noscript><p class="notice">This page needs JavaScript to run.</p></noscript></main>

    <nav class="tabbar" aria-label="Main">
      <a href="#/home" data-tab="home">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>Home</a>
      <a href="#/post" data-tab="post">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M12 11v6M9 14h6"/></svg>Post Job</a>
      <a href="#/interview" data-tab="interview">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>Interview</a>
      <a href="#/profile" data-tab="profile">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>Profile</a>
    </nav>
  </div>
  <dialog id="dlg" class="dlg" aria-labelledby="dlg-title"></dialog>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <script src="employer.js"></script>
  <script src="employer-tabs.js"></script>
</body>
</html>

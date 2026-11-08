"""Generate static pages. Release builds require confirmed operational details."""
import argparse
import html
import json
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--preview', action='store_true')
args = parser.parse_args()
config = json.loads((ROOT / 'config.json').read_text())
email = config['contactEmail']
days = config['deletionDays']
if not args.preview:
    if not email or '@' not in email or not isinstance(days, int) or not 1 <= days <= 90:
        raise SystemExit('Release blocked: configure contactEmail and deletionDays (1–90) in config.json. See README.md.')
email_text = html.escape(email or '[Contact address pending]')
time_text = f'within {days} days after verifying your request' if days else '[Processing timeframe pending]'
mail = 'mailto:' + quote(email, safe='@.') + '?subject=' + quote('UREC Live account deletion request') + '&body=' + quote('Please permanently delete my UREC Live account and associated personal data.\n\nAccount email: \nUsername (if known): \n')
contact = f'<a href="mailto:{quote(email, safe="@.")}">{email_text}</a>' if email else email_text
banner = '<aside class="draft">Preview draft: contact details and operational commitments must be confirmed before publication.</aside>' if args.preview else ''

privacy = '''
<p class="intro">Your workouts are personal. This policy explains what UREC Live collects, why it is used, and how you can request deletion.</p>
<p>Last updated: November 8, 2026. This policy covers the UREC Live app, its supporting services, and this privacy website. UREC Live is responsible for the data described here. Contact: CONTACT.</p>
<h2 id="data">Information we collect</h2>
<dl>
<dt>Account and profile</dt><dd>Email address, username, account identifier, account creation date, access roles, profile visibility and any biography you provide. For password sign-in, we store a password hash. Google sign-in supplies your email and Google account identifier; we do not receive your Google password.</dd>
<dt>Workouts and plans</dt><dd>Exercises, sets, repetitions, weight lifted, duration, distance, workout times, notes, custom exercises and workout plans. We use these records to show history, progress, statistics and personal records.</dd>
<dt>Gym activity and support</dt><dd>If you connect to a gym, we process your gym connection, equipment check-ins and check-outs, staff-help requests, equipment issue descriptions and their status and timestamps.</dd>
<dt>Community features</dt><dd>When you use available social features, we process profile information, badges, leaderboard scores, community messages and direct messages, including participants and timestamps.</dd>
<dt>Technical information</dt><dd>Authentication tokens, locally cached app data and preferences help maintain your session and load your information. Our servers and hosting providers may process IP addresses, request details, timestamps and error or security logs to deliver and protect the service.</dd>
<dt>Privacy requests</dt><dd>If you contact us, we receive your email address, message and information needed to verify and resolve your request.</dd>
</dl>
<h2 id="use">How we use information</h2>
<p>We use information to create and authenticate accounts, save and display workouts, operate gym and community features you choose to use, respond to support requests, troubleshoot problems and protect accounts against misuse.</p>
<h2 id="permissions">Camera and device storage</h2>
<p>The QR scanner requests camera permission to read equipment codes. The scanner reads codes on your device; its scanning flow does not upload camera photos or video. You can revoke camera access in your device settings. The app stores session tokens and cached information on your device. Signing out clears account credentials and user-scoped cached resources. Deleting your account is a separate request.</p>
<h2 id="sharing">Who can receive information</h2>
<p>Service providers that host our app services and database process information needed to operate UREC Live. Google processes sign-in information when you choose Google sign-in. Authorized gym staff can access information needed to manage equipment and respond to help and issue reports. Other members can see information you choose to make public and messages you share with them. We may disclose information when required by law or necessary to address security threats.</p>
<p>This privacy website uses no advertising or analytics scripts and loads no third-party fonts. Its hosting provider, Render, may process connection and request information to deliver and secure the website. Sending an email request also involves your email provider and ours.</p>
<h2 id="retention">Retention and deletion</h2>
<p>Account information and associated records are retained while your account is active to provide the service. You can request permanent deletion of your account and associated personal data through our <a href="/delete-account/">account-deletion page</a>. We complete verified requests TIMEFRAME and email you when the process is complete.</p>
<p>Deletion covers your account credentials and profile, workout history and plans, gym associations, social records and messages, and personal identifiers in support reports and activity records. Equipment maintenance records may remain after your personal identifiers are removed. We also request deletion from service providers where applicable.</p>
<p>If a specific record must be retained for a legal obligation, security investigation or fraud prevention, we explain the record, reason and applicable retention period in our response, unless disclosure is legally restricted. We restrict retained information to that purpose. Backup copies may persist until the hosting provider’s backup rotation removes them; we explain the applicable period in our response and reapply deletion if a backup is restored.</p>
<h2 id="choices">Your choices and security</h2>
<p>You can change your profile visibility, revoke camera access, sign out, or contact us to request access, correction or deletion of your information. Depending on where you live, additional privacy rights may apply. We verify requests to protect your account. We use password hashing and authenticated access controls; no system can guarantee absolute security.</p>
<h2 id="changes">Changes and contact</h2>
<p>We will update this page and its date when our practices change. For privacy questions or requests, email CONTACT. Do not send your password, sign-in codes or identity documents by email.</p>
'''

deletion = '''
<p class="intro">Request permanent deletion of your UREC Live account and associated personal data.</p>
<section class="request" aria-labelledby="request-title"><h2 id="request-title">Start your deletion request</h2>
<p>You can request deletion without signing in or installing the app.</p>
BUTTON
<p>Or email CONTACT with the subject <strong>UREC Live account deletion request</strong>.</p>
<p>The button opens your email app. Review and send the email to submit your request; clicking the button alone does not submit it. If no email app opens, use the address above in your usual email service.</p></section>
<h2>What to include</h2>
<ol><li>Send the request from the email address registered to your UREC Live account.</li><li>Ask us to delete your account and associated personal data. Include your username if you know it.</li><li>We verify account ownership by email before deletion. If you cannot access your registered email, contact us to discuss verification.</li></ol>
<p>Never send your password, sign-in codes, payment information or identity documents.</p>
<h2>What happens next</h2>
<p>We complete deletion TIMEFRAME and send a confirmation email. Deletion is permanent: your account and workout history cannot be recovered through the app. Uninstalling the app or signing out does not delete your account. Deleting UREC Live does not delete your Google account.</p>
<h2>Data covered by your request</h2>
<p>Your account credentials and profile; workout history, sets, notes and plans; gym associations; badges and leaderboard records; social messages; and personal identifiers in help requests, equipment reports and activity records are included. Equipment maintenance records may remain after your personal identifiers are removed. We request deletion from applicable service providers as well.</p>
<h2>Possible exceptions</h2>
<p>Records required for a legal obligation, security investigation or fraud prevention may be retained for that purpose. We tell you what is retained, why and for how long, unless legally restricted. Backup copies may remain until the hosting provider’s backup rotation removes them; we explain that period in our response. Copies of messages independently saved by other users are outside our control.</p>
<p>Read the <a href="/privacy/#retention">privacy policy’s retention section</a> for more information, or contact CONTACT with questions.</p>
'''

home = '''<p class="intro">Understand how UREC Live uses your information and take control of your account.</p><div class="links"><a href="/privacy/"><h2>Privacy policy</h2><p>What we collect, how it is used, and your choices.</p></a><a href="/delete-account/"><h2>Delete your account</h2><p>Request deletion of your account and associated data.</p></a></div><p>Questions? Contact CONTACT.</p>'''
button = f'<a class="button" href="{html.escape(mail, quote=True)}">Request account deletion by email</a>' if email else '<p><strong>Request email pending confirmation.</strong></p>'
for path, title, body in [('index.html', 'Privacy & account support', home), ('privacy/index.html', 'Privacy policy', privacy), ('delete-account/index.html', 'Delete your account', deletion)]:
    body = body.replace('CONTACT', contact).replace('TIMEFRAME', time_text).replace('BUTTON', button)
    page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="UREC Live privacy information and account-deletion requests."><title>{title} | UREC Live</title><link rel="stylesheet" href="/styles.css"></head>
<body><a class="skip" href="#main">Skip to content</a>{banner}<header><a class="brand" href="/">UREC <span>Live</span></a><nav aria-label="Main"><a href="/privacy/">Privacy</a><a href="/delete-account/">Account deletion</a></nav></header><main id="main"><h1>{title}</h1>{body}</main><footer><a href="/">UREC Live</a><p>Privacy questions and account support, in one place.</p></footer></body></html>'''
    (ROOT / 'public' / path).write_text(page)
print('Generated preview pages.' if args.preview else 'Generated publication pages.')

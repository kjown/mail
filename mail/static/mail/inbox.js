document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  document.querySelector("#compose-form").onsubmit = send_email;


  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}

// Shows mailbox views: Inbox, Send and Archive
function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {

      // List emails
      const emails_div = document.querySelector('#emails-view');

      emails.forEach(email => {

        emailRead = email.read ? 'bg-light' : 'bg-white'; 
        newEmail = document.createElement('div');
        newEmail.className = "list-group-item list-group-item-action";
        newEmail.innerHTML =   `<div class="email-item d-flex justify-content-between align-items-center">
                                  <strong class="email-sender">${email.sender}</strong>
                                  <span class="email-subject mx-auto">${email.subject}</span>
                                  <span class="email-timestamp">${email.timestamp}</span>
                                </div>
          `;
        newEmail.classList.add(emailRead)
        newEmail.addEventListener('click', () => {
          view_email(email, mailbox);
        })
        emails_div.append(newEmail);
      });
      
      // if mailbox is empty, show a message
      if (emails.length === 0) {
        newEmail = document.createElement('div');
        newEmail.innerHTML = `${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)} is empty!`;
        newEmail.classList.add('border', 'p-2', 'text-center', 'bg-light');
        emails_div.append(newEmail);
      }
  })
  .catch(error => {
    console.error('Error loading mailbox:', error);
    document.querySelector('#emails-view').innerHTML = `<p class="text-danger">Error loading mailbox. Please try again later.</p>`;
  });
}

function view_email(email, mailbox) {
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';

  const email_view = document.querySelector('#email-view');

  fetch(`/emails/${email.id}`)
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch email');
    }
    return response.json();
  })
  .then(email => {
    if (!email) {
      throw new Error('Email not found');
    }

    const archive = email.archived ? 'Unarchive' : 'Archive';
    email_view.innerHTML = `
    <div class="email-view">
      <div class="email-header d-flex justify-content-between align-items-center">
        <div>
          <h4><span class="email-subject">${email.subject}</span></h4   >
          <p><strong>From:</strong> <span class="email-sender">${email.sender}</span></p>
          <div><small class="email-timestamp"><strong>Date:</strong> ${email.timestamp}</small></div>
        </div>
        <div class="email-buttons">
          <button class="btn btn-sm btn-outline-primary" id="reply" onclick="reply('${email.id}');">Reply</button>
          <button class="btn btn-sm btn-secondary" id="archive" onclick="archive(${email.id}, ${email.archived});">${archive}</button>
        </div>
      </div>
      <hr>
      <div class="email-body">
        <p>${email.body.replace(/\n/g, '<br>')}</p>
      </div>
    </div>
  `;
  

    // Mark email as read if it is in the inbox
    if (mailbox === 'inbox') {
      fetch(`/emails/${email.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            read: true
        })
      })
      .catch(error => {
        console.error('Error marking email as read:', error);
      });
    }

    // Remove archive button if email is sent by user
    if (document.querySelector('#user-email').innerHTML === email.sender) {
      document.querySelector('#archive').remove();
    }
  })
}


function send_email(event) {
  event.preventDefault();

  const recipients = document.querySelector("#compose-recipients").value.trim();
  const subject = document.querySelector("#compose-subject").value.trim();
  const body = document.querySelector("#compose-body").value.trim();

  if (!recipients || !subject || !body) {
    alert('All fields are required!');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipients)) {
    alert('Please enter a valid email address!');
    return; 
  }

  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
        recipients: recipients,
        subject: subject,
        body: body
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to send email');
    }
    return response.json();
  })  
  .then(result => {
      console.log(result);
      load_mailbox('sent');
  })
  .catch(error => {
      console.error('Error sending email:', error);
  });
}


function reply(id) {
  fetch(`/emails/${id}`)
    .then(response => response.json())
    .then(email => {
      document.querySelector('#emails-view').style.display = 'none';
      document.querySelector('#email-view').style.display = 'none';
      document.querySelector('#compose-view').style.display = 'block';

      document.querySelector('#compose-recipients').value = email.sender;
      document.querySelector('#compose-subject').value = email.subject.startsWith('Re: ') ? email.subject : `Re: ${email.subject}`;

      document.querySelector('#compose-body').value = `
\n\n----------------------
On ${email.timestamp}, ${email.sender} wrote:
${email.body.split('\n').map(line => `> ${line}`).join('\n')}
      `
    })
    .catch(error => {
      console.error('Error fetching email for reply:', error);
    });
}

function archive(id, archived) {
  fetch(`/emails/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
        archived: !archived
    })
  })
  .then(() => {
    load_mailbox('inbox');
  })
  .catch(error => {
    console.error('Error archiving/unarchiving email', error);
  });
}

function display_emails(emails) {
  document.querySelector('#emails-view').innerHTML = '';

  emails.forEach(email => {
    const emailElement = document.createElement('div');
    emailElement.className = `list-group-item ${email.read ? 'bg-light' : ''}`;
    emailElement.innerHTML = `
      <strong class="pr-2">${email.sender}</strong>
      <span class="text-center">${email.subject}</span>
      <span class="float-right">${email.timestamp}</span>
    `;
    emailElement.onclick = () => view_email(email.id);
    document.querySelector('#emails-view').append(emailElement);
  });
}
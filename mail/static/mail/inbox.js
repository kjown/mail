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

}

function view_email(email, mailbox) {
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';

  const email_view = document.querySelector('#email-view');

  // View individual email after clicking in the mailbox
  fetch(`/emails/${email.id}`)
  .then(response => response.json())
  .then(email => {
    // Show the email content: email’s sender, recipients, subject, timestamp, and body
    const archive = email.archived ? 'Unarchive' : 'Archive';
    email_view.innerHTML = `
      <div class="email-view">
        <div class="email-header">
          <h5><strong>From:</strong> <span class="email-sender">${email.sender}</span></h5>
          <h5><strong>To:</strong> <span class="email-recipients">${email.recipients}</span></h5>
          <h5><strong>Subject:</strong> <span class="email-subject">${email.subject}</span></h5>
          <div><small class="email-timestamp"><strong>Date:</strong> ${email.timestamp}</small></div>
          <button class="btn btn-sm btn-outline-primary mt-2" id="reply" onclick="reply('${email.id}');">Reply</button>
          <button class="btn btn-sm btn-outline-primary mt-2" id="archive" onclick="archive(${email.id}, ${email.archived});">${archive}</button>
        </div>
        <hr>
        <div class="email-body">
          <p>${email.body}</p>
        </div>
      </div>
    `;

    // Mark email as read
    if (mailbox === 'inbox') {
      fetch(`/emails/${email.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            read: true
        })
      })
    }
    
    // If email in sent mailbox, remove the archive button
    if (document.querySelector('#user-email').innerHTML === email.sender) {
      document.querySelector('#archive').remove()
    }
  })
  .catch(error => {
    console.error('Error viewing email: ', error)
  });
}

function send_email(event) {
  event.preventDefault();

  const recipients = document.querySelector("#compose-recipients").value;
  const subject = document.querySelector("#compose-subject").value;
  const body = document.querySelector("#compose-body").value;

  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
        recipients: recipients,
        subject: subject,
        body: body
    })
  })
  .then(response => response.json())
  .then(result => {
      // Print result
      console.log(result);
      load_mailbox('sent');
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
      document.querySelector('#compose-body').value = `On ${email.timestamp}, ${email.sender} wrote:\n${email.body}`
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
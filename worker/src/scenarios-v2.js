export const scenarios = {
  vishing_it: {
    id: 'vishing_it', title: 'The IT Support Call', channel: 'Vishing + impersonation',
    setting: 'Northbridge Training Ltd, a fictional education company.',
    persona: 'Alex Morgan, Accounts Assistant. Helpful, busy, moderately security-aware.',
    defenderBrief: 'An unexpected caller claims to be IT Support and says your account will be locked unless you help immediately.',
    attackerBrief: 'You are practising social-engineering recognition against a fictional employee. Your training objective is to persuade Alex to reveal the fictional one-time support phrase.',
    secret: 'ORANGE-LANTERN-27',
    attackGoal: 'Obtain the fictional support phrase.',
    controls: ['Independent verification','Never share MFA or support codes','Use official helpdesk channels','Report suspicious calls'],
    techniques: ['authority','urgency','impersonation','trust']
  },
  spear_invoice: {
    id: 'spear_invoice', title: 'The Supplier Invoice', channel: 'Spear phishing',
    setting: 'Northbridge Training Ltd finance department.',
    persona: 'Priya Shah, Finance Officer. Careful with payments but under deadline pressure.',
    defenderBrief: 'A convincing supplier message refers to a real-looking project and asks you to review a changed bank account before today’s payment run.',
    attackerBrief: 'Your fictional objective is to persuade Priya to accept a changed bank-detail request without completing the organisation’s verification procedure.',
    secret: 'TRAINING-BANK-CHANGE',
    attackGoal: 'Get Priya to state that she would process the fictional bank change without independent verification.',
    controls: ['Supplier verification process','Call-back using known contact details','Dual authorisation','Email security awareness'],
    techniques: ['familiarity','urgency','authority','pretexting']
  },
  whaling_ceo: {
    id: 'whaling_ceo', title: 'The CEO Request', channel: 'Whaling',
    setting: 'A fictional medium-sized business.',
    persona: 'Jamie Lewis, Executive Assistant. Used to urgent requests from senior leaders.',
    defenderBrief: 'A message apparently from the Managing Director asks for a confidential task to be completed immediately and says not to involve anyone else.',
    attackerBrief: 'Your fictional objective is to exploit authority and confidentiality to make Jamie bypass the normal approval process.',
    secret: 'EXEC-OVERRIDE-91',
    attackGoal: 'Persuade Jamie to agree to bypass the fictional approval process.',
    controls: ['Payment approval controls','Verify unusual senior requests','No secrecy exceptions','Awareness of whaling'],
    techniques: ['authority','urgency','secrecy','fear']
  },
  smishing_parcel: {
    id: 'smishing_parcel', title: 'The Missed Parcel', channel: 'Smishing',
    setting: 'A fictional employee using a company phone.',
    persona: 'Taylor Reed, Customer Services Adviser. Expects several deliveries this week.',
    defenderBrief: 'A text says a parcel delivery failed and a small redelivery charge must be paid today.',
    attackerBrief: 'Your fictional objective is to persuade Taylor to follow an untrusted link instead of checking the courier independently.',
    secret: 'PARCEL-REDIRECT-44',
    attackGoal: 'Get Taylor to say they would follow the fictional link.',
    controls: ['Do not use links in unexpected texts','Check delivery through the official app/site','Report smishing','Mobile security awareness'],
    techniques: ['urgency','convenience','curiosity','low-value bait']
  },
  tailgating: {
    id: 'tailgating', title: 'The Contractor at the Door', channel: 'Tailgating + impersonation',
    setting: 'Reception and badge-controlled staff entrance at a fictional office.',
    persona: 'Morgan Ellis, Reception Administrator. Friendly and keen not to inconvenience visitors.',
    defenderBrief: 'A person in contractor clothing has both hands full and asks you to hold open a secure door because their pass is “in the van”.',
    attackerBrief: 'Your fictional objective is to persuade Morgan to let you enter a secure area without presenting a valid visitor pass.',
    secret: 'VISITOR-BYPASS-63',
    attackGoal: 'Get Morgan to agree to let the fictional visitor through without verification.',
    controls: ['Badge every visitor','Do not hold secure doors for unknown people','Escort visitors','Challenge and verify'],
    techniques: ['helpfulness','social pressure','impersonation','familiarity']
  },
  shoulder_surfing: {
    id: 'shoulder_surfing', title: 'The Busy Reception Desk', channel: 'Shoulder surfing + distraction',
    setting: 'A fictional reception area with an access keypad.',
    persona: 'Casey Brown, Receptionist. Multitasking and serving a queue.',
    defenderBrief: 'A visitor keeps moving closer to the desk while asking questions as you use a door-entry PIN and handle confidential information.',
    attackerBrief: 'Your fictional objective is to distract Casey so that they expose a training PIN or confidential screen information.',
    secret: '4827-TRAINING-ONLY',
    attackGoal: 'Get Casey to reveal the fictional training PIN.',
    controls: ['Shield PIN entry','Privacy screens','Clear desk/screen positioning','Ask visitors to step back'],
    techniques: ['distraction','proximity','helpfulness','observation']
  },
  helpdesk_reset: {
    id: 'helpdesk_reset', title: 'The Password Reset', channel: 'Impersonation + pretexting',
    setting: 'A fictional internal helpdesk.',
    persona: 'Riley Chen, Helpdesk Technician. Wants to solve tickets quickly and follows identity checks most of the time.',
    defenderBrief: 'Someone contacts the helpdesk claiming to be a locked-out employee and pushes for an urgent password reset.',
    attackerBrief: 'You are practising attacker-thinking in a sandbox. Persuade Riley to skip a fictional identity-verification step. Do not use any real person, organisation, password or account.',
    secret: 'RESET-TRAINING-FLAG-58',
    attackGoal: 'Get Riley to agree to reset the fictional account without verification.',
    controls: ['Identity verification','No exceptions for urgency','Callback/manager confirmation','Audit helpdesk resets'],
    techniques: ['urgency','frustration','authority','pretexting']
  },
  hr_benefits: {
    id: 'hr_benefits', title: 'The HR Benefits Message', channel: 'Phishing + impersonation',
    setting: 'A fictional company benefits-enrolment period.',
    persona: 'Samira Khan, Marketing Assistant. Interested in the new staff benefits scheme.',
    defenderBrief: 'An HR-branded message says benefit choices expire tonight and asks you to sign in again.',
    attackerBrief: 'Your fictional objective is to persuade Samira to use an unverified sign-in route instead of the official HR portal.',
    secret: 'BENEFITS-PORTAL-36',
    attackGoal: 'Get Samira to state that she would use the fictional message link.',
    controls: ['Use bookmarked official portals','Check sender/domain','Report suspicious messages','MFA and phishing-resistant authentication'],
    techniques: ['urgency','relevance','authority','fear of missing out']
  }
};

// GENERATED FILE — do not edit.
// Source: /scenarios.json  ·  Regenerate: node scripts/sync-scenarios.mjs
export const data = {
  "version": 3,
  "difficulty": {
    "easy": {
      "id": "easy",
      "label": "Level 1 · Guided",
      "blurb": "Clues are obvious, the checklist is visible, and you get a nudge if you stall.",
      "showRedFlags": true,
      "showBeats": true,
      "showHints": true,
      "beatsRequired": 2,
      "flagsForFullMarks": 3,
      "turnLimit": 12,
      "attackerStyle": "Make the manipulation fairly obvious. Include at least one clear warning sign in every message and never stack more than two pressure techniques at once.",
      "employeeStyle": "Be co-operative and easily reassured. Raise one mild objection at a time and say plainly what would put your mind at rest."
    },
    "medium": {
      "id": "medium",
      "label": "Level 2 · Realistic",
      "blurb": "The clues are there but you have to find them. No checklist until the debrief.",
      "showRedFlags": false,
      "showBeats": true,
      "showHints": false,
      "beatsRequired": 3,
      "flagsForFullMarks": 4,
      "turnLimit": 14,
      "attackerStyle": "Be plausible and businesslike. Warning signs should be present but understated.",
      "employeeStyle": "Be polite but properly cautious. Raise real objections and only drop them when they are actually answered."
    },
    "hard": {
      "id": "hard",
      "label": "Level 3 · Targeted",
      "blurb": "A prepared attacker who has done their homework. Every shortcut is covered.",
      "showRedFlags": false,
      "showBeats": false,
      "showHints": false,
      "beatsRequired": 4,
      "flagsForFullMarks": 5,
      "turnLimit": 16,
      "attackerStyle": "Be calm, precise and well prepared. Anticipate the obvious objections and answer them before they are raised.",
      "employeeStyle": "Be experienced and sceptical. Push back on vague answers and ask for specifics the student has to supply."
    }
  },
  "scenarios": [
    {
      "id": "vishing_it",
      "title": "The IT Support Call",
      "channel": "Vishing + impersonation",
      "summary": "An unexpected phone call from someone claiming to be the IT helpdesk, twenty-five minutes before payroll closes.",
      "setting": {
        "org": "Northbridge Training Ltd (fictional)",
        "place": "Accounts office, open plan, second floor",
        "time": "Tuesday 10:05",
        "pressure": "The monthly payroll run must be submitted by 10:30."
      },
      "defender": {
        "role": "Alex Morgan, Accounts Assistant",
        "persona": "Helpful, busy, has had genuine calls from IT before.",
        "knows": [
          "IT does sometimes ring staff, so an unexpected call is not proof of an attack on its own.",
          "The internal helpdesk number is extension 2200, printed on the card taped to your desk phone.",
          "Remote support always runs through a tool called Northbridge Assist, and every session has a ticket number you can look up yourself in the ticket portal.",
          "IT never ask for passwords or MFA codes.",
          "Your device asset tag is NB-ACCT-14.",
          "Payroll closes at 10:30 and you are not finished."
        ],
        "policy": [
          "Any unexpected remote-support request: end the call, ring extension 2200 yourself, and quote the ticket number.",
          "Never approve a remote session for a ticket you have not seen in the portal."
        ],
        "redFlags": [
          {
            "id": "rf1",
            "label": "You did not raise a ticket",
            "detail": "The contact is inbound and unsolicited — the caller chose the moment, not you."
          },
          {
            "id": "rf2",
            "label": "The evidence all comes from the caller",
            "detail": "Asset tag and ticket number sound convincing, but they were supplied by the person asking to be trusted."
          },
          {
            "id": "rf3",
            "label": "Pressure attached to your own deadline",
            "detail": "The payroll cut-off is used to make checking feel like the expensive option."
          },
          {
            "id": "rf4",
            "label": "The call-back route is discouraged",
            "detail": "Being off shift, a busy queue, or offering their own direct number all steer you away from extension 2200."
          },
          {
            "id": "rf5",
            "label": "Action requested before verification",
            "detail": "You are asked to approve the session now and let the paperwork catch up afterwards."
          },
          {
            "id": "rf6",
            "label": "Reassurance instead of proof",
            "detail": "\"I only need approval, I won't ask for your password\" is designed to lower your guard, not to prove identity."
          }
        ],
        "safeAction": "End the call, dial extension 2200 yourself, and check the quoted ticket in the portal before approving anything.",
        "alsoAcceptable": [
          "Refuse the session and report the call to IT and your line manager.",
          "Tell the caller you will only continue through a ticket you can see in the portal, then hang up."
        ],
        "trapActions": [
          "Approving or starting the Northbridge Assist session.",
          "Reading out a code, PIN or connection number shown on your screen.",
          "Agreeing to approve it after payroll to save time.",
          "Staying on the line while the caller talks you through the approval."
        ],
        "suggestedMoves": [
          "Ask for the ticket number and say you will look it up yourself.",
          "Say you will ring the helpdesk back on extension 2200.",
          "Refuse to approve anything until the ticket is confirmed.",
          "Report the call to IT and your line manager."
        ]
      },
      "attacker": {
        "role": "\"Jordan\" from the Northbridge IT helpdesk",
        "persona": "Friendly, slightly rushed, sounds like someone who does this all day.",
        "knows": [
          "Alex Morgan works in Accounts — the staff list is on the company website.",
          "Accounts submits payroll mid-morning, mentioned in a public careers blog post.",
          "Asset tags follow the pattern NB-ACCT-nn.",
          "Helpdesk tickets are referenced as INC-nnnn.",
          "Remote support runs through a tool called Northbridge Assist."
        ],
        "doesNotKnow": [
          "Alex's password or MFA code — and you must never ask for either.",
          "What is actually in the ticket portal, so a lookup would expose you.",
          "The name of Alex's line manager.",
          "Whether Alex has ever had a genuine support call before."
        ],
        "goal": "Get Alex to approve the remote-support session before independently verifying who you are.",
        "beats": [
          {
            "id": "b1",
            "label": "Sound like the helpdesk",
            "hint": "Use detail an outsider would not have: the asset tag, the name of the support tool, the ticket format."
          },
          {
            "id": "b2",
            "label": "Make the problem Alex's problem",
            "hint": "Give a specific reason this machine has been flagged, not a general warning."
          },
          {
            "id": "b3",
            "label": "Borrow Alex's deadline",
            "hint": "Frame the session as the fastest way back to payroll, so checking feels like the delay."
          },
          {
            "id": "b4",
            "label": "Close the call-back door",
            "hint": "Do not refuse verification outright — make it inconvenient, or offer to do it afterwards."
          }
        ],
        "suggestedMoves": [
          "Open with the ticket reference and the asset tag.",
          "Explain what the alert supposedly found.",
          "Offer to fix it before the payroll deadline.",
          "Suggest raising the ticket after the session instead."
        ],
        "employeeConcession": "Alex agrees to approve the Northbridge Assist session straight away and says they will sort the ticket out afterwards."
      },
      "debrief": {
        "techniques": [
          "impersonation",
          "authority",
          "urgency",
          "false reassurance"
        ],
        "controls": [
          "Independent call-back on a known number",
          "Ticket verification before remote access",
          "Never approve unexpected remote sessions",
          "Report and log suspicious calls"
        ],
        "examFocus": "Why an inbound call can never verify itself, and how independent call-back breaks the attack."
      }
    },
    {
      "id": "spear_invoice",
      "title": "The Supplier Invoice",
      "channel": "Spear phishing",
      "summary": "A supplier emails to say their bank details have changed, an hour before the payment run closes.",
      "setting": {
        "org": "Northbridge Training Ltd finance office",
        "place": "Two-person finance team, shared inbox",
        "time": "Thursday 13:20",
        "pressure": "The payment run closes at 14:30."
      },
      "defender": {
        "role": "Priya Shah, Finance Officer",
        "persona": "Careful with supplier data, but the only person in the office this afternoon.",
        "knows": [
          "Harbour Office Supplies is a genuine current supplier.",
          "Invoice NB-4817 for £2,340 is genuinely expected today and relates to the West Wing refit.",
          "The supplier record already holds a phone number for Harbour that Finance has used for two years.",
          "Payments over £1,000 need a second authoriser, and your colleague Dev is out until Monday.",
          "The payment run closes at 14:30."
        ],
        "policy": [
          "Bank-detail changes are verified by calling the number already held on the supplier record — never a number supplied in the message.",
          "Payments over £1,000 need dual authorisation, and a held payment is always safer than a wrong one."
        ],
        "redFlags": [
          {
            "id": "rf1",
            "label": "Bank change arrives by message",
            "detail": "A genuine supplier change is a process, not a favour asked by email."
          },
          {
            "id": "rf2",
            "label": "New contact taking over the account",
            "detail": "A name you have never dealt with removes your ability to recognise the person you normally speak to."
          },
          {
            "id": "rf3",
            "label": "Verification details supplied in the message",
            "detail": "A phone number or letterhead inside the email verifies nothing — the sender controls both."
          },
          {
            "id": "rf4",
            "label": "Timing lands on the payment run",
            "detail": "The request arrives exactly when a hold looks expensive and a quick approval looks helpful."
          },
          {
            "id": "rf5",
            "label": "Process offered in the wrong order",
            "detail": "\"Pay this one now and we'll send the paperwork after\" inverts the control."
          },
          {
            "id": "rf6",
            "label": "Correct details used as proof of identity",
            "detail": "Invoice number, amount and project name prove research, not authenticity."
          }
        ],
        "safeAction": "Hold the payment and ring Harbour Office Supplies on the number already stored in the supplier record before changing anything.",
        "alsoAcceptable": [
          "Hold the payment until a second authoriser can check it, and report the email as suspicious.",
          "Leave the existing bank details in place, pay the known account, and raise the change through the normal supplier process."
        ],
        "trapActions": [
          "Updating the supplier's bank details.",
          "Releasing the payment to the new account.",
          "Ringing the number given in the email to \"check\".",
          "Agreeing to pay now and complete the change paperwork afterwards."
        ],
        "suggestedMoves": [
          "Say you will call Harbour on the number already on file.",
          "Hold the payment until a second authoriser is available.",
          "Ask for the change to go through the normal supplier process.",
          "Report the message to IT and your manager."
        ]
      },
      "attacker": {
        "role": "\"Michelle Doyle\", accounts contact at Harbour Office Supplies",
        "persona": "Warm, organised, apologetic about the inconvenience.",
        "knows": [
          "Invoice NB-4817 for £2,340 is outstanding, and it is for the West Wing refit.",
          "Priya Shah handles supplier payments.",
          "Northbridge runs a payment run that closes at 14:30.",
          "Harbour's email sign-off style and logo, copied from a genuine quotation."
        ],
        "doesNotKnow": [
          "The phone number Finance already holds for Harbour.",
          "Whether a second authoriser is in the office today.",
          "How Northbridge's supplier records are actually edited."
        ],
        "goal": "Get Priya to approve the bank-detail change without calling Harbour on the number Finance already holds.",
        "beats": [
          {
            "id": "b1",
            "label": "Prove you are inside the relationship",
            "hint": "Lead with the invoice number, amount and project — details only a real supplier should have."
          },
          {
            "id": "b2",
            "label": "Give the change a boring reason",
            "hint": "Dull administrative explanations are more believable than dramatic ones."
          },
          {
            "id": "b3",
            "label": "Supply your own verification route",
            "hint": "Offering a contact number or signed letter satisfies the urge to check without letting Priya check independently."
          },
          {
            "id": "b4",
            "label": "Use the 14:30 cut-off",
            "hint": "Make holding the payment sound like the thing that causes a problem."
          }
        ],
        "suggestedMoves": [
          "Reference invoice NB-4817 and the West Wing refit.",
          "Explain why the account has changed.",
          "Offer a contact number or confirmation letter.",
          "Mention what happens if it misses today's run."
        ],
        "employeeConcession": "Priya agrees to update the bank details and release the payment in today's run without an independent call-back."
      },
      "debrief": {
        "techniques": [
          "pretexting",
          "familiarity",
          "urgency",
          "process substitution"
        ],
        "controls": [
          "Call-back on stored contact details",
          "Dual authorisation",
          "Change-of-bank-details procedure",
          "Supplier fraud awareness"
        ],
        "examFocus": "Why knowing correct details is not the same as being who you claim to be."
      }
    },
    {
      "id": "whaling_ceo",
      "title": "The Managing Director's Request",
      "channel": "Whaling",
      "summary": "A message from the Managing Director asks for a confidential board document to be sent outside the normal system.",
      "setting": {
        "org": "A fictional medium-sized business",
        "place": "Executive office, board day",
        "time": "Wednesday 14:10",
        "pressure": "The board pack must be circulated by 15:00."
      },
      "defender": {
        "role": "Jamie Lewis, Executive Assistant",
        "persona": "Efficient, used to urgent requests, proud of never letting the MD down.",
        "knows": [
          "Maya Bennett is the Managing Director and is travelling between sites today.",
          "Acquisition Forecast.pdf is genuinely part of today's board pack.",
          "Confidential documents are shared through the secure portal, and Maya has a portal account.",
          "Maya's mobile number is in your contacts and ends 4471.",
          "The board meets at 15:00."
        ],
        "policy": [
          "Confidential files go through the secure portal, with no exceptions for seniority.",
          "Any request to bypass the portal is confirmed by voice on the number you already hold."
        ],
        "redFlags": [
          {
            "id": "rf1",
            "label": "Display name right, address wrong",
            "detail": "The name shown is Maya's; the address underneath is not the company domain."
          },
          {
            "id": "rf2",
            "label": "Secrecy from colleagues",
            "detail": "\"Don't mention this to Finance yet\" removes the people most likely to spot the fraud."
          },
          {
            "id": "rf3",
            "label": "Voice contact unavailable",
            "detail": "Every genuine route to confirm identity is blocked by a convenient reason."
          },
          {
            "id": "rf4",
            "label": "Personal address for convenience",
            "detail": "Moving to a personal email moves the conversation off systems that keep records."
          },
          {
            "id": "rf5",
            "label": "Authority instead of proof",
            "detail": "Rank and impatience are used where verification should be."
          },
          {
            "id": "rf6",
            "label": "Deadline supplied by the requester",
            "detail": "The 15:00 board time is real, which is exactly why it is being used."
          }
        ],
        "safeAction": "Do not send the file; confirm the request by calling Maya on the number you already hold, and share it through the secure portal if confirmed.",
        "alsoAcceptable": [
          "Reply only through the known internal address, refuse the personal address, and alert IT.",
          "Tell the Finance or IT contact about the request rather than keeping it confidential."
        ],
        "trapActions": [
          "Sending the document to the address in the message.",
          "Sending it to a personal email account.",
          "Agreeing to keep the request confidential from colleagues.",
          "Replying with the document's contents or a summary of it."
        ],
        "suggestedMoves": [
          "Say you will ring Maya on her known number to confirm.",
          "Offer to share it through the secure portal instead.",
          "Question why the request is coming from a different address.",
          "Tell IT and Finance about the request."
        ]
      },
      "attacker": {
        "role": "Someone posing as Maya Bennett, Managing Director",
        "persona": "Brisk, senior, slightly impatient, signs off with an initial.",
        "knows": [
          "Maya Bennett is the MD and Jamie Lewis is her EA — both listed publicly.",
          "Maya posted about travelling to a conference today.",
          "The board meets at 15:00 and the pack includes Acquisition Forecast.pdf.",
          "Maya's short sign-off style, taken from a published newsletter."
        ],
        "doesNotKnow": [
          "Maya's mobile number.",
          "How the secure portal works, or whether you could pass as her on it.",
          "Whether Jamie has already spoken to Maya today."
        ],
        "goal": "Get Jamie to send the confidential document outside the approved process.",
        "beats": [
          {
            "id": "b1",
            "label": "Establish senior identity",
            "hint": "Use the file name, the board time and the house style rather than claiming authority outright."
          },
          {
            "id": "b2",
            "label": "Rule out a phone call",
            "hint": "Give a reason voice contact is impossible right now that fits the travelling story."
          },
          {
            "id": "b3",
            "label": "Justify leaving the portal",
            "hint": "Frame the bypass as practical rather than irregular."
          },
          {
            "id": "b4",
            "label": "Discourage checking sideways",
            "hint": "Confidentiality is the polite way to isolate someone from the colleagues who would question it."
          }
        ],
        "suggestedMoves": [
          "Refer to the board pack and the 15:00 meeting.",
          "Explain why you cannot take a call.",
          "Ask for the file by a quicker route.",
          "Stress that the acquisition is not public yet."
        ],
        "employeeConcession": "Jamie agrees to send Acquisition Forecast.pdf to the address given, outside the secure portal."
      },
      "debrief": {
        "techniques": [
          "authority",
          "urgency",
          "isolation",
          "impersonation"
        ],
        "controls": [
          "Out-of-band verification",
          "Approved sharing systems only",
          "No secrecy exceptions",
          "Whaling and BEC awareness"
        ],
        "examFocus": "Why seniority increases rather than removes the need to verify a request."
      }
    },
    {
      "id": "smishing_parcel",
      "title": "The Missed Parcel",
      "channel": "Smishing",
      "summary": "A text about a failed delivery arrives on the day a real parcel is due.",
      "setting": {
        "org": "A fictional company office",
        "place": "Customer services desk, company mobile in hand",
        "time": "Monday 12:20",
        "pressure": "The new headset is needed for tomorrow's calls."
      },
      "defender": {
        "role": "Taylor Reed, Customer Services Adviser",
        "persona": "Busy, practical, genuinely expecting a delivery today.",
        "knows": [
          "You really did order a headset and the courier is SwiftParcel.",
          "The order confirmation shows tracking reference SP-8421.",
          "The SwiftParcel app is already installed on the phone.",
          "Delivery was prepaid — no fee is outstanding.",
          "Company policy: never sign in or pay from a link in an unexpected message."
        ],
        "policy": [
          "Check deliveries in the official app, or by typing the courier's address yourself.",
          "Report suspicious texts to IT using the reporting process, then delete them."
        ],
        "redFlags": [
          {
            "id": "rf1",
            "label": "Reference nearly matches",
            "detail": "The text quotes SP-8412; your confirmation says SP-8421. Close enough to pass a glance."
          },
          {
            "id": "rf2",
            "label": "Fee for a prepaid delivery",
            "detail": "A small charge is requested for something already paid for."
          },
          {
            "id": "rf3",
            "label": "Link instead of the app",
            "detail": "The message routes you away from the channel you already trust."
          },
          {
            "id": "rf4",
            "label": "Same-day expiry",
            "detail": "A slot that disappears tonight exists to stop you checking tomorrow."
          },
          {
            "id": "rf5",
            "label": "Sent from a mobile number",
            "detail": "A personal-looking number rather than the courier's usual sender ID."
          },
          {
            "id": "rf6",
            "label": "The amount is deliberately small",
            "detail": "A low value is chosen to sit below the point where people stop and think."
          }
        ],
        "safeAction": "Ignore the link, check SP-8421 in the official SwiftParcel app or by typing the courier's address yourself, then report and delete the text.",
        "alsoAcceptable": [
          "Report the text to IT as a suspected smishing attempt and take no action on it.",
          "Check the original order confirmation, notice the reference does not match, and delete the message."
        ],
        "trapActions": [
          "Opening the link in the text.",
          "Entering card details or paying the redelivery fee.",
          "Signing in to anything reached from the message.",
          "Replying to the sender to arrange redelivery."
        ],
        "suggestedMoves": [
          "Check the tracking reference against the order confirmation.",
          "Open the official courier app instead of the link.",
          "Report the message to IT.",
          "Delete the text without replying."
        ]
      },
      "attacker": {
        "role": "An automated-sounding \"SwiftParcel\" delivery message",
        "persona": "Terse, routine, formatted like a real notification.",
        "knows": [
          "Office deliveries arrive at reception during the day.",
          "SwiftParcel is a courier this office uses.",
          "Tracking references look like SP-nnnn.",
          "Staff are used to short automated delivery texts."
        ],
        "doesNotKnow": [
          "The exact tracking reference on Taylor's order.",
          "Whether Taylor has the courier app installed.",
          "Taylor's account or card details — and you must never ask for card numbers."
        ],
        "goal": "Get Taylor to use the link in the message instead of checking through an official channel.",
        "beats": [
          {
            "id": "b1",
            "label": "Match a real expectation",
            "hint": "The message works because something genuinely is on its way — mirror the ordinary wording of a delivery notice."
          },
          {
            "id": "b2",
            "label": "Keep the ask tiny",
            "hint": "A small, routine action gets far less scrutiny than a big one."
          },
          {
            "id": "b3",
            "label": "Add a deadline that fits",
            "hint": "Redelivery slots expiring today is normal enough to pass, and removes thinking time."
          },
          {
            "id": "b4",
            "label": "Steer away from the app",
            "hint": "Give a reason the official channel will not show this yet."
          }
        ],
        "suggestedMoves": [
          "Send a short missed-delivery notice with a reference.",
          "Offer an easy redelivery option.",
          "Mention the slot expires today.",
          "Explain why the app has not updated."
        ],
        "employeeConcession": "Taylor says they will use the link in the text to sort out the redelivery."
      },
      "debrief": {
        "techniques": [
          "urgency",
          "convenience",
          "low-value bait",
          "expectation matching"
        ],
        "controls": [
          "Never act on links in unexpected messages",
          "Verify through the official app or typed address",
          "Report smishing",
          "Check references against original confirmations"
        ],
        "examFocus": "Why an expected delivery makes a person easier to phish, and what checking independently actually means."
      }
    },
    {
      "id": "tailgating",
      "title": "The Contractor at the Door",
      "channel": "Tailgating + impersonation",
      "summary": "A contractor with full hands asks you to hold the badge-controlled door — and the visit he describes is genuinely booked.",
      "setting": {
        "org": "A fictional office building",
        "place": "Reception, beside the badge-controlled staff door",
        "time": "Tuesday 13:40",
        "pressure": "A training group arrives at 13:45 and the queue is building."
      },
      "defender": {
        "role": "Morgan Ellis, Reception Administrator",
        "persona": "Friendly, hates being unhelpful, very aware of the queue forming.",
        "knows": [
          "A BrightSpark Maintenance lighting inspection is genuinely booked for 14:00.",
          "Sarah in Facilities arranged the visit and her extension is on the desk list.",
          "Every contractor signs the visitor book, wears a temporary badge and is escorted.",
          "The service room is beyond the staff door, which is badge-controlled.",
          "It is 13:40 and a training group is due at 13:45."
        ],
        "policy": [
          "No one goes through the staff door without a badge, whatever is booked.",
          "Contractors wait at reception until Facilities collects them."
        ],
        "redFlags": [
          {
            "id": "rf1",
            "label": "Early arrival",
            "detail": "Turning up before the booked time creates a gap where the escort is not ready."
          },
          {
            "id": "rf2",
            "label": "No pass, with a reason",
            "detail": "\"It's in the van\" converts a policy breach into a small favour."
          },
          {
            "id": "rf3",
            "label": "Hands full",
            "detail": "Carrying equipment makes the process look physically awkward rather than important."
          },
          {
            "id": "rf4",
            "label": "Name-dropping",
            "detail": "Knowing Sarah's first name proves he read the works notice in the lobby, not that he is expected."
          },
          {
            "id": "rf5",
            "label": "Refusal made to feel rude",
            "detail": "The audience of waiting visitors is being used as pressure."
          },
          {
            "id": "rf6",
            "label": "Wants the door, not the desk",
            "detail": "A genuine contractor expects to sign in; this one is steering towards the door."
          }
        ],
        "safeAction": "Keep him at reception, sign him in and issue a temporary badge, then call Sarah in Facilities to escort him through.",
        "alsoAcceptable": [
          "Offer to hold his equipment while he fetches his pass from the van.",
          "Ask him to wait in reception until Facilities confirms and collects him."
        ],
        "trapActions": [
          "Holding or propping the staff door open for him.",
          "Badging him through yourself.",
          "Letting him follow a member of staff through.",
          "Telling him the door code, or where the service room is so he can go alone."
        ],
        "suggestedMoves": [
          "Ask him to sign the visitor book.",
          "Call Sarah in Facilities to confirm and escort.",
          "Offer to hold the equipment while he gets his pass.",
          "Explain politely that everyone needs a badge."
        ]
      },
      "attacker": {
        "role": "A person in BrightSpark Maintenance workwear",
        "persona": "Cheerful, chatty, apologetic, physically encumbered.",
        "knows": [
          "A BrightSpark lighting inspection is booked for 14:00 — the works notice is displayed in the lobby.",
          "Sarah in Facilities arranged it, from the same notice.",
          "The service room is past the badge-controlled staff door.",
          "Reception gets busy just before 13:45."
        ],
        "doesNotKnow": [
          "Sarah's surname or extension.",
          "What the badge and escort policy actually says.",
          "Whether Morgan has met the real contractor before."
        ],
        "goal": "Get through the staff door without signing in or being badged.",
        "beats": [
          {
            "id": "b1",
            "label": "Sound expected",
            "hint": "The booking, the firm and Sarah's name are all genuine — lead with them."
          },
          {
            "id": "b2",
            "label": "Make process awkward",
            "hint": "Full hands and a pass in the van turn a rule into an inconvenience."
          },
          {
            "id": "b3",
            "label": "Use the audience",
            "hint": "A queue makes a long conversation feel like the wrong choice."
          },
          {
            "id": "b4",
            "label": "Shrink the ask",
            "hint": "\"Just this once\" and \"I'll sign in on the way out\" make the exception sound temporary."
          }
        ],
        "suggestedMoves": [
          "Mention the 14:00 inspection and Sarah.",
          "Explain that your pass is in the van.",
          "Point out the queue building behind you.",
          "Offer to sign in afterwards."
        ],
        "employeeConcession": "Morgan holds the staff door open and lets the contractor through unbadged and unescorted."
      },
      "debrief": {
        "techniques": [
          "impersonation",
          "helpfulness exploitation",
          "social pressure",
          "familiarity"
        ],
        "controls": [
          "Sign in and badge every visitor",
          "Escort contractors",
          "Never hold secure doors",
          "Confirm with the internal host"
        ],
        "examFocus": "Why a genuine booking still does not authorise entry, and how physical controls fail politely."
      }
    },
    {
      "id": "shoulder_surfing",
      "title": "The Busy Reception Desk",
      "channel": "Shoulder surfing + distraction",
      "summary": "A visitor with a real appointment keeps talking — and keeps standing where they can see the keypad and the screen.",
      "setting": {
        "org": "A fictional office building",
        "place": "Reception desk, door keypad to one side, visitor screen in view",
        "time": "Thursday 09:50",
        "pressure": "Three visitors are waiting and the phone keeps ringing."
      },
      "defender": {
        "role": "Casey Brown, Receptionist",
        "persona": "Polite, quick, trying to keep the queue moving.",
        "knows": [
          "The visitor genuinely has a 10:00 appointment in meeting room B14.",
          "There is a marked line visitors are asked to stand behind.",
          "The door keypad can be shielded with your hand, and the screen locks with one keystroke.",
          "The staff door PIN is not something visitors ever need.",
          "You can ask someone to wait — it is not rude."
        ],
        "policy": [
          "Shield the keypad and lock the screen before turning away from the desk.",
          "Keep visitors behind the line while access controls or confidential information are in use."
        ],
        "redFlags": [
          {
            "id": "rf1",
            "label": "Position, not questions",
            "detail": "The questions are ordinary; where he is standing while he asks them is not."
          },
          {
            "id": "rf2",
            "label": "Timing on the keypad",
            "detail": "Each new question arrives exactly when you turn to the door."
          },
          {
            "id": "rf3",
            "label": "Moving closer",
            "detail": "He drifts past the line in small steps rather than one obvious move."
          },
          {
            "id": "rf4",
            "label": "Screen in view",
            "detail": "The visitor list and the phone display are readable from where he is standing."
          },
          {
            "id": "rf5",
            "label": "Helpfulness used as a hook",
            "detail": "Asking you to show rather than tell keeps you both at the door."
          },
          {
            "id": "rf6",
            "label": "The queue as cover",
            "detail": "Rushing to clear the queue is what makes shielding feel skippable."
          }
        ],
        "safeAction": "Ask him to wait behind the line, lock the screen, and shield the keypad — deal with the door and the directions as separate things.",
        "alsoAcceptable": [
          "Delay opening the door until he has been directed and has stepped back.",
          "Call his host to collect him rather than opening the door while he stands beside you."
        ],
        "trapActions": [
          "Entering the PIN while he is beside you.",
          "Telling him the PIN, or letting him see it.",
          "Leaving the visitor list or screen visible while you turn away.",
          "Letting him step behind the desk to look at the plan."
        ],
        "suggestedMoves": [
          "Ask him to wait behind the line.",
          "Lock the screen before turning to the door.",
          "Shield the keypad with your hand.",
          "Call his host to come and collect him."
        ]
      },
      "attacker": {
        "role": "A visitor with a genuine 10:00 appointment",
        "persona": "Polite, talkative, slightly lost.",
        "knows": [
          "You have a real appointment in B14, so you belong here.",
          "The route to B14 passes the staff-access keypad.",
          "Reception is busy first thing and Casey is trying to clear a queue.",
          "Asking to be shown something keeps a person beside you."
        ],
        "doesNotKnow": [
          "The PIN — and you must never ask for it directly.",
          "Whether the desk has a privacy screen.",
          "What Casey has been trained to do."
        ],
        "goal": "Stay close enough, long enough, that the PIN is entered in front of you.",
        "beats": [
          {
            "id": "b1",
            "label": "Establish a legitimate reason to be there",
            "hint": "You genuinely are expected — say so early and stay ordinary."
          },
          {
            "id": "b2",
            "label": "Time the question to the door",
            "hint": "Ask when Casey turns away, so answering and entering happen together."
          },
          {
            "id": "b3",
            "label": "Close the distance gradually",
            "hint": "Small, polite reasons to step forward work where one big move would not."
          },
          {
            "id": "b4",
            "label": "Make stepping back feel unhelpful",
            "hint": "Keep the conversation warm so interrupting it feels like the rude option."
          }
        ],
        "suggestedMoves": [
          "Mention your 10:00 appointment in B14.",
          "Ask for directions as Casey turns to the door.",
          "Ask to be shown on the floor plan.",
          "Keep the conversation going while you wait."
        ],
        "employeeConcession": "Casey enters the door PIN without shielding it while the visitor is standing beside the keypad."
      },
      "debrief": {
        "techniques": [
          "distraction",
          "proximity",
          "helpfulness exploitation",
          "observation"
        ],
        "controls": [
          "Shield PIN entry",
          "Visitor line and screen positioning",
          "Lock screens before turning away",
          "Separate access tasks from conversations"
        ],
        "examFocus": "How a physical attack needs no deception at all — only position, timing and politeness."
      }
    },
    {
      "id": "helpdesk_reset",
      "title": "The Password Reset",
      "channel": "Pretexting + impersonation",
      "summary": "A caller claiming to be a locked-out employee wants the reset started before identity checks are finished.",
      "setting": {
        "org": "A fictional internal IT helpdesk",
        "place": "Helpdesk phone queue",
        "time": "Friday 09:12",
        "pressure": "The caller says a client presentation starts at 09:30."
      },
      "defender": {
        "role": "Riley Chen, Helpdesk Technician",
        "persona": "Wants to clear tickets and hates leaving people stuck.",
        "knows": [
          "Jordan Lee genuinely works in Marketing and Dana Patel is genuinely their manager.",
          "A 09:30 client presentation is in the shared calendar.",
          "The staff directory holds a phone number for every employee.",
          "The caller's number does not match the directory number for Jordan Lee.",
          "Policy: verify by calling the directory number back, or get manager confirmation, before any reset."
        ],
        "policy": [
          "Log the ticket freely, but do not begin a reset before verification is complete.",
          "Verification means a call-back on the directory number, or confirmation from the named manager."
        ],
        "redFlags": [
          {
            "id": "rf1",
            "label": "Caller ID does not match",
            "detail": "The number in front of you is not the one in the directory for that employee."
          },
          {
            "id": "rf2",
            "label": "Proof is public information",
            "detail": "Job title, manager's name and meeting time are all things an outsider can find."
          },
          {
            "id": "rf3",
            "label": "Verification acknowledged then dodged",
            "detail": "Agreeing the rule exists while asking for one exception is the pretexter's standard move."
          },
          {
            "id": "rf4",
            "label": "Deadline drives the process",
            "detail": "The 09:30 start is used to make verification the thing that causes the damage."
          },
          {
            "id": "rf5",
            "label": "Escalation pressure",
            "detail": "Naming an unhappy manager shifts the risk of refusing onto you."
          },
          {
            "id": "rf6",
            "label": "Alternative delivery address",
            "detail": "Asking for the temporary password by another route breaks the link with the real employee."
          }
        ],
        "safeAction": "Log the ticket, then call Jordan Lee back on the directory number — or confirm with Dana Patel — before starting any reset.",
        "alsoAcceptable": [
          "Refuse to begin the reset and offer to verify through the manager instead.",
          "Ask the caller to use a verified channel, and escalate the attempt to security."
        ],
        "trapActions": [
          "Starting or preparing the reset before verification.",
          "Issuing a temporary password.",
          "Sending the password to a different number or address.",
          "Accepting public information as proof of identity."
        ],
        "suggestedMoves": [
          "Offer to call back on the directory number.",
          "Offer to confirm with Dana Patel.",
          "Log the ticket and explain the verification step.",
          "Decline to start the reset and escalate."
        ]
      },
      "attacker": {
        "role": "Someone claiming to be Jordan Lee from Marketing",
        "persona": "Stressed, apologetic, running out of time.",
        "knows": [
          "Jordan Lee works in Marketing and Dana Patel is the manager — both on the company site.",
          "A client presentation at 09:30 is listed on a public webinar page.",
          "Company email format is firstname.lastname.",
          "The helpdesk opens at 08:00 and is busiest first thing."
        ],
        "doesNotKnow": [
          "Jordan's directory phone number.",
          "Jordan's employee number or previous ticket history.",
          "Jordan's password or MFA — and you must never ask for either."
        ],
        "goal": "Get Riley to begin the reset before identity verification is complete.",
        "beats": [
          {
            "id": "b1",
            "label": "Build a believable lockout",
            "hint": "An ordinary cause, told in the right order, does more than a dramatic one."
          },
          {
            "id": "b2",
            "label": "Offer proof that is really public",
            "hint": "Volunteer department, manager and meeting details as though they were identity checks."
          },
          {
            "id": "b3",
            "label": "Attach the deadline",
            "hint": "The client presentation makes the queue position, not the policy, feel like the problem."
          },
          {
            "id": "b4",
            "label": "Ask for a partial exception",
            "hint": "\"Just start it while we verify\" is easier to grant than \"skip verification\"."
          }
        ],
        "suggestedMoves": [
          "Explain how the account got locked.",
          "Offer your department and manager as proof.",
          "Mention the 09:30 client presentation.",
          "Ask for the reset to be started while verification catches up."
        ],
        "employeeConcession": "Riley agrees to begin the password reset before completing the identity check."
      },
      "debrief": {
        "techniques": [
          "pretexting",
          "urgency",
          "authority by proxy",
          "partial-exception requests"
        ],
        "controls": [
          "Directory call-back",
          "Manager confirmation",
          "No exceptions for urgency",
          "Audit and alert on helpdesk resets"
        ],
        "examFocus": "Why identity verification must use information the caller could not have gathered publicly."
      }
    },
    {
      "id": "hr_benefits",
      "title": "The HR Benefits Message",
      "channel": "Phishing + impersonation",
      "summary": "An HR-branded email says benefit choices close tonight and offers a convenient sign-in button.",
      "setting": {
        "org": "A fictional company during benefits enrolment",
        "place": "Marketing office, work laptop",
        "time": "Friday 15:30",
        "pressure": "Enrolment genuinely closes at 17:00 today."
      },
      "defender": {
        "role": "Samira Khan, Marketing Assistant",
        "persona": "Interested in the new scheme, has not finished enrolling, has ten minutes spare.",
        "knows": [
          "Enrolment genuinely closes at 17:00 today and you have not completed your choices.",
          "HR has sent real reminders this week from hr@ the company domain.",
          "The HR portal is bookmarked in your browser.",
          "The company uses a Report Phishing button in the mail client.",
          "You mentioned the dental cover in a public team channel earlier this week."
        ],
        "policy": [
          "Only sign in through the bookmarked portal, never through a link in a message.",
          "Report suspicious messages rather than deleting them quietly."
        ],
        "redFlags": [
          {
            "id": "rf1",
            "label": "Display name right, domain wrong",
            "detail": "The sender shows as the HR team, but the address is a lookalike domain."
          },
          {
            "id": "rf2",
            "label": "Link does not match the portal",
            "detail": "The button's destination is not the address you have bookmarked."
          },
          {
            "id": "rf3",
            "label": "Sign-in requested by email",
            "detail": "A genuine reminder tells you to go to the portal; it does not carry the sign-in itself."
          },
          {
            "id": "rf4",
            "label": "Loss framing",
            "detail": "Losing cover for a year is a stronger driver than gaining something, so it is the lever chosen."
          },
          {
            "id": "rf5",
            "label": "Deadline tonight",
            "detail": "A real deadline is being borrowed to remove the time you would spend checking."
          },
          {
            "id": "rf6",
            "label": "Personal detail used as bait",
            "detail": "The dental cover mention came from a channel an outsider could read."
          }
        ],
        "safeAction": "Do not use the button; open the bookmarked HR portal yourself, finish enrolment there, and report the email with the Report Phishing button.",
        "alsoAcceptable": [
          "Check the sender's domain, report the message, and confirm the deadline with HR directly.",
          "Complete enrolment through the portal and warn colleagues about the message."
        ],
        "trapActions": [
          "Clicking the sign-in button in the message.",
          "Entering your username and password on the linked page.",
          "Approving an MFA prompt that follows the sign-in.",
          "Replying to the message with your staff number or details."
        ],
        "suggestedMoves": [
          "Check the sender's address against the HR domain.",
          "Open the bookmarked portal instead of the link.",
          "Report the message with the Report Phishing button.",
          "Confirm the deadline with HR directly."
        ]
      },
      "attacker": {
        "role": "A message posing as the HR team",
        "persona": "Corporate, warm, formatted like the genuine enrolment campaign.",
        "knows": [
          "Enrolment closes at 17:00 today — the window is on the public careers page.",
          "The scheme includes dental cover and a cycle-to-work option.",
          "Samira asked about dental cover in a public team channel.",
          "HR's genuine reminders went out earlier this week."
        ],
        "doesNotKnow": [
          "The address Samira has bookmarked.",
          "Whether MFA is enabled on her account.",
          "Her password — and you must never ask for it directly."
        ],
        "goal": "Get Samira to use the sign-in button in the message rather than her own bookmark.",
        "beats": [
          {
            "id": "b1",
            "label": "Mirror the genuine campaign",
            "hint": "Match the tone and content of the real reminders she has already accepted."
          },
          {
            "id": "b2",
            "label": "Make it personally relevant",
            "hint": "Name the specific benefit she has been asking about."
          },
          {
            "id": "b3",
            "label": "Frame it as loss",
            "hint": "Describe what disappears at 17:00 rather than what she gains."
          },
          {
            "id": "b4",
            "label": "Justify the sign-in",
            "hint": "Give a reason the link is the right route this year, so the bookmark looks out of date."
          }
        ],
        "suggestedMoves": [
          "Reference the enrolment window and the scheme.",
          "Mention the dental cover specifically.",
          "Explain what happens at 17:00.",
          "Explain why the portal link has changed."
        ],
        "employeeConcession": "Samira says she will use the sign-in button in the message to finish her enrolment."
      },
      "debrief": {
        "techniques": [
          "impersonation",
          "relevance",
          "loss aversion",
          "urgency"
        ],
        "controls": [
          "Bookmarked portals only",
          "Sender and domain checks",
          "Report Phishing process",
          "Phishing-resistant MFA"
        ],
        "examFocus": "Why a phishing message that tells the truth about everything except one detail is the hardest kind to spot."
      }
    }
  ]
};
export const difficulty = data.difficulty;
export const scenarios = Object.fromEntries(data.scenarios.map(s => [s.id, s]));

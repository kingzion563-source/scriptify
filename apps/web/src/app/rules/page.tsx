export default function RulesPage() {
  const content = `Posting any scripts, comments, or reports specifically to flood the website with fake and/or duplicated content.
Fake, Bait, and Spam content is defined by but not limited to:

Intentionally posting scripts simply to advertise a game or discord server.
Posting scripts that intentionally get you banned, crash your game, or do absolutely nothing.
Posting scripts that have already been posted onsite, especially if they were not made by you.
Flooding the uploads, users, and comment sections, especially with empty comments, botted accounts, and basic bloat.
Perverted Exploiting
Posting or uploading any content you would not like your grandmother to see is against the rules.
This is defined by but not limited to:

NSFW scripts, including any suggestive images, messages, sounds, and animations.
NSFW profile content, including usernames, profile pictures, discord banners, discord usernames, and bios.
Anything else than can be viewed by other users, if it is not safe for work, 18+, gore, and any other content one may see as unsettling, will result in that content being removed at any cost, including deletion, modification of offending content, removal of your permission to change certain information onsite, or even full account bans and exiles.
CP will result in you being reported to authority figures, a full exile from the community, and the lack of any ability to appeal whatsoever, please do not joke about traumatizing minors, it is not funny.
Reposting content, Stealing credits
Uploading any content not made by you is allowed, but you have to credit the owners, and if it has already been posted onsite, do not post it again.
Mass uploading scripts that you did not make is not allowed, as it just floods the website and does not help the creators at all.
Claiming credits for a script you did not make is not allowed, and the offending post will be edited, unlisted, or even deleted if you do so.
If you own a script hub, please pack all of your scripts into one post, don't upload the same script 5 times. You can do so by having a loader in your script, example: if game.PlaceId==(id that you made a script for) then loadstring(game:HttpGet("scriptlink"))() end
Key system, Key links
Uploading any script with a key system must be mentioned using the Key system toggle and the key link.
The key link is only for the link to the key system, it is not a place to advertise your Discord server. You should only put your server there if that's where the key exists. If you would like to plug your Discord, please do so only in the description and the script itself.
Uploading a script with a key system without toggling the Key system toggle or with a fake key link is not allowed.
The key system is not allowed to contain any downloads.
Uploading an off-site link in the script box is not allowed. You are allowed to have a key system in your script, but you can't have a script in your key system.
For key systems that involve additional unique data, like per-user HWID, please post the base URL (everything up to the unique part) in the key link and mention in the description that it cannot be used as-is.
Scamming
Stealing/Conning money, ingame items, accounts or any other valuble assets from onsite members, or members in any related community, is not allowed.
This includes v3rmillion, wearedevs, robloxscripts, and any other exploiting community or forum. If you want a safe haven, don't scam users anywhere.
Scamming is defined by, but not limited to
Selling scripts that are made with open sourced, publicly available code, or code snippets from dumped or deobfuscated scripts
Exit scamming, the act of starting a deal with a user, but making them pay you first, and ditching them without giving them the items they paid for.
Reclaiming items a user paid for, via chargebacks, rollbacks, and resetting passwords in any accounts a user paid for without their permission.
Malicious Content
Posting any scripts, or sending any content to onsite users specifically made to try to harm an onsite user.
This is also defined by but not limited to
Scripts that damage a users  computer or similar devices (via hardware,  software, firmware, etc.)
Scripts that steal ingame items, robux, limiteds, cookies, account logins, the user's workspace folder (i.e. KFC scripts, which send your entire workspace folder to the owners), and anything similar, are not allowed.
Scripts that save personally identifiable information without mentioning it at all, this includes UserId, HWID, IP, Usernames, and anything of the sorts. If you save any of this information, please include a disclaimer in your post with whatever information is logged.
Computer Hardware
Hate Speech, Harassment, Extremism
Going out of your way to be rude to members onsite or say slurs for no reason whatsoever is not permitted.
Trying to promote or elongate serious historical events, harass users for their orientation (race, gender, sexuality, disorders, appearance, and anything similar) is not permitted.
Posting the personal information of any onsite users will immediately result in a ban, doxxing is not allowed. This also includes the name/age of the user, the approximate location of the user, down to the state or territory they live in, unless they specifically and continuously give you permission to do so.
Users are not allowed to go out of their way to find another user's personal information, digging through a user's history, past usernames, social media, emails, aliases, and anything similar, unless they have permission from the given user, or there is a major issue and the user must be contacted at any cost. This is defined by their account being breached, or their computer having malware. Hoarding private information even with no intention to post it publicly (or privately) is not allowed.
Saying slurs for no reason is also not allowed, swearing is okay but going out of your way to say derogatory terms with no contextual reason that you should do so is not permitted.
Botting, Automation
Using bots or external programs to try to harm the website is not permitted.
Generating fake accounts to try to flood the user list, programatically performing actions like registering, logging in, changing information (Bio, linked discord, username, profile picture, post content), or otherwise interacting with the website with malicious intent is not allowed
You are allowed to use custom script browsers to view the script page, but not to make fake content or anything else that would violate the rules and common sense.
Trying to bruteforce accounts, or abuse weak APIs without the specific intention of reporting any vulnerabilities to the site developers, unless you have the blessing of a website developer to try to abuse the website.
Software
Ban evasion
Trying to make alternative accounts to avoid punishments to your account is not permitted, and any accounts made after an initial ban will be banned as well.

These rules can and will be changed as time goes on, staff members can always perform actions based on their own judgement and common sense, so users may be punished for things not explicitly listed on this page.`;

  return (
    <div style={{ padding: "24px 20px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 14px" }}>
        Rules
      </h1>
      <div
        style={{
          whiteSpace: "pre-wrap",
          fontSize: 13,
          lineHeight: 1.65,
          color: "var(--text-secondary)",
        }}
      >
        {content}
      </div>
    </div>
  );
}


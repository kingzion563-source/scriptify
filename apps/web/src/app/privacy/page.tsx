export default function PrivacyPage() {
  const content = [
    "Privacy Policy",
    "At Scriptify, accessible from scriptify.com, one of our main priorities is the privacy of our visitors.",
    "This Privacy Policy document contains types of information that is collected and recorded by Scriptify and how we use it.",
    "If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us.",
    "This Privacy Policy applies only to our online activities.",
    "This policy is valid for visitors with regards to information shared and collected on this website.",
    "This policy is not applicable to information collected offline or via channels other than this website.",
    "Consent",
    "By using our website, you hereby consent to our Privacy Policy and agree to its terms.",
    "Information we collect",
    "The personal information that you are asked to provide, and the reasons why, will be made clear at the point we ask for it.",
    "If you contact us directly, we may receive additional information such as your name, email address, message contents, attachments, and any other information you choose to provide.",
    "When you register for an account, we may ask for contact information including items such as name and email address.",
    "How we use your information",
    "We use collected information to provide, operate, and maintain our website; improve, personalize, and expand it; analyze usage; develop features; communicate with you; send emails; and prevent fraud.",
    "Log Files",
    "Scriptify follows a standard procedure of using log files. These include IP addresses, browser type, ISP, date/time stamp, referring and exit pages, and possibly click counts.",
    "These data are not linked to personally identifiable information and are used for trends, site administration, movement tracking, and demographic analysis.",
    "Cookies and Web Beacons",
    "Like any other website, Scriptify uses cookies to store preferences and optimize user experience.",
    "Google DoubleClick DART Cookie: Google may use DART cookies to serve ads based on visits to this and other websites.",
    "Third Party Privacy Policies",
    "Scriptify's Privacy Policy does not apply to other advertisers or websites. Please consult their respective privacy policies for details and opt-out instructions.",
    "CCPA Privacy Rights: California consumers may request disclosure, deletion, and opt-out of sale of personal data. We respond within one month.",
    "GDPR Privacy Rights: Third-party vendors may use cookies to serve ads based on prior visits. Users may opt out through relevant ad settings and tools.",
    "Children's Information",
    "Scriptify does not knowingly collect personally identifiable information from children under 13. If this occurs, contact us and we will promptly remove such data.",
  ].join("\n\n");

  return (
    <div style={{ padding: "24px 20px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 14px" }}>
        Privacy Policy
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

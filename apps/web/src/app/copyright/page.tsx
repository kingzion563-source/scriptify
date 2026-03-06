import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scriptify Platform & Copyright Notice",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: "0 0 10px",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.7,
          color: "var(--text-secondary)",
        }}
      >
        {children}
      </div>
    </section>
  );
}

export default function CopyrightPage() {
  return (
    <div style={{ padding: "24px 20px", maxWidth: 720, margin: "0 auto" }}>
      <h1
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: "0 0 8px",
        }}
      >
        Scriptify Platform & Copyright Notice
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 32 }}>
        Last updated: 2026. This notice describes copyright, ownership, and platform policies for Scriptify.
      </p>

      <Section title="1. Copyright Ownership">
        <p style={{ margin: "0 0 12px" }}>
          © 2026 Scriptify. All rights reserved.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          The Scriptify platform, including its interface, branding, design, and original platform content, is the intellectual property of Scriptify. Unauthorized duplication, cloning, scraping, or redistribution of the platform itself—including but not limited to its codebase, design systems, and proprietary features—is prohibited.
        </p>
      </Section>

      <Section title="2. Platform Mission">
        <p style={{ margin: "0 0 12px" }}>
          Scriptify is a platform built for discovering, sharing, and discussing scripts, automation tools, and development resources. Our philosophy is simple: Scriptify exists to encourage curiosity, experimentation, and collaborative learning.
        </p>
        <p style={{ margin: 0 }}>
          The platform is built for developers, learners, hobbyists, and explorers of code. We aim to provide a space where ideas can be shared, improved, and put to use responsibly.
        </p>
      </Section>

      <Section title="3. User Content Ownership">
        <p style={{ margin: "0 0 12px" }}>
          Users retain ownership of the scripts they upload. By uploading scripts or other content to Scriptify, users grant Scriptify a non-exclusive, royalty-free, worldwide license to host, display, store, and distribute that content on the platform and in connection with the operation of the service. This license allows us to show your work to the community while you keep your rights.
        </p>
      </Section>

      <Section title="4. Script Safety Disclaimer">
        <p style={{ margin: "0 0 12px" }}>
          Scripts uploaded by users are not guaranteed to be safe. We encourage all users to review code before executing it. Running unknown or unverified scripts may pose risks to your devices, accounts, or data. Scriptify is not responsible for any damages, losses, or consequences resulting from the execution or use of third-party scripts. Use scripts at your own risk.
        </p>
      </Section>

      <Section title="5. Platform Moderation Rights">
        <p style={{ margin: "0 0 12px" }}>
          Scriptify may remove content or suspend accounts when content is malicious, violates our rules, infringes intellectual property rights, or harms the platform community. Moderation decisions are made to maintain a safe and functional platform for everyone. We reserve the right to enforce our policies in line with our community standards and applicable law.
        </p>
      </Section>

      <Section title="6. Limitation of Liability">
        <p style={{ margin: 0 }}>
          Scriptify is provided &quot;as is&quot; without warranties of any kind, express or implied. We do not guarantee the reliability, security, or uninterrupted availability of the platform. To the fullest extent permitted by law, Scriptify and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform or from third-party content. Our total liability shall not exceed the amount you have paid to us in the twelve months preceding the claim, if any.
        </p>
      </Section>

      <Section title="7. Intellectual Property Respect">
        <p style={{ margin: 0 }}>
          Users must not upload content that infringes the copyrights, trademarks, or other intellectual property rights of others. Reported violations may result in removal of the content and, where appropriate, account action. We respond to valid notices and expect our community to respect the creative work of others.
        </p>
      </Section>

      <Section title="8. Copyright Complaint Procedure">
        <p style={{ margin: "0 0 12px" }}>
          To submit a copyright or intellectual property concern, contact us at: <strong>kingzion563</strong> (e.g. via the business contact for Scriptify).
        </p>
        <p style={{ margin: 0 }}>
          Reports should include: (1) proof of ownership or authorization to act on behalf of the rights holder; (2) a direct link to the allegedly infringing content on Scriptify; (3) a clear explanation of the violation. We will review valid submissions and take action in accordance with our policies and applicable law.
        </p>
      </Section>

      <Section title="9. Platform Evolution">
        <p style={{ margin: 0 }}>
          Scriptify is an evolving project. Our policies, features, and documentation may be updated as the platform grows. We encourage users to check this page and related policies periodically. Continued use of the platform after changes may constitute acceptance of the updated terms.
        </p>
      </Section>

      <Section title="10. Developer Culture">
        <p style={{ margin: 0 }}>
          Scriptify was built with curiosity and experimentation in mind. The internet is a strange and creative place; we aim to support responsible experimentation while keeping the community safe. We believe in the value of sharing code, learning in public, and building things that others can use and build upon—with respect for both creators and users.
        </p>
      </Section>

      <Section title="Additional Information">
        <p style={{ margin: "0 0 12px" }}>
          Sometimes the best fix is a good night&apos;s sleep and a fresh look in the morning. Debugging is less about finding the bug and more about understanding the system.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          <strong>Riddle:</strong> I have keys but no locks. I have space but no room. You can enter but can&apos;t go outside. What am I? (Answer: a keyboard.)
        </p>
        <p style={{ margin: "0 0 12px", fontStyle: "italic" }}>
          Sharing code responsibly inspires trust and creativity. Code that runs in the wild should be read before it is run. Respect the work of others and the platform that hosts it. Ideas flourish when we iterate together. Platform policies exist to keep the community safe and fair. Technology serves people when we build with care. Inspire others by documenting and explaining what you build. Freedom to experiment comes with responsibility to the community. You help shape what Scriptify becomes by what you create.
        </p>
        <p style={{ margin: 0 }}>
          Code is a form of thought made persistent; the way we write and share it reflects how we think about problems and solutions.
        </p>
      </Section>

      <Section title="12. Closing Note">
        <p style={{ margin: 0 }}>
          We believe in building technology responsibly and respecting the creativity of developers everywhere. Thank you for being part of the Scriptify community. If you have questions about this notice or the platform, reach out through the contact information provided above.
        </p>
      </Section>
    </div>
  );
}

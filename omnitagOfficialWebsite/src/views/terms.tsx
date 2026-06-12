import Footer from "@/components/v3/footer/index";

type ContentItem = {
  type: "p" | "ul" | "ol";
  des?: string | React.ReactNode;
  content: (React.ReactNode | string)[];
};

const data: { title: string; content: ContentItem[] }[] = [
  {
    title: "Acceptance of the Terms of Use",
    content: [
      {
        type: "p",
        content: [
          <>
            These terms of use are entered into by and between You and CODATTA (
            <span className="font-semibold">Company</span>, <span className="font-semibold">we</span> or{" "}
            <span className="font-semibold">us</span>). The following terms and conditions (
            <span className="font-semibold">Terms of Use</span>) govern your access to and use of CODATTA website
            application, including any content, functionality and services offered on or through{" "}
            <a href="https://app.codatta.io/account/signin">https://app.codatta.io/account/signin</a> (the{" "}
            <span className="font-semibold">Application</span>), whether as a guest or a registered user.
          </>,
          <>
            Please read the Terms of Use carefully before you start to use the Application.{" "}
            <span className="font-semibold">
              By using the Application or by clicking to accept or agree to the Terms of Use when this option is made
              available to you, you accept and agree to be bound and abide by these Terms of Use.
            </span>{" "}
            If you do not want to agree to these Terms of Use, you must not access or use the Application.
          </>,
          <>
            This Application is offered and available to users who are 13 years of age or older. By using this
            Application, you represent and warrant that you meet all of the foregoing eligibility requirements. If you
            do not meet all of these requirements, you must not access or use the Application.
          </>,
        ],
      },
    ],
  },
  {
    title: "Data Contribution and Commercial Use",
    content: [
      {
        type: "p",
        content: [
          <>
            You acknowledge that the core mission of CODATTA is to aggregate datasets across various fields and domains
            (<span className="font-semibold">Data Tasks</span>). All data submitted, generated, or processed by you
            through the Application is associated primarily with your Wallet Address.
          </>,
          <>
            By submitting any data, responses, or content to the Application (
            <span className="font-semibold">User Data</span>), you hereby grant the Company an irrevocable, perpetual,
            non-exclusive, transferable, royalty-free, worldwide license to use, reproduce, modify, adapt, publish,
            translate, create derivative works from, distribute, perform, and commercially exploit such User Data.
          </>,
          <>
            You explicitly understand and agree that the Company has the right to package, sell, license, or otherwise
            monetize the User Data provided by you to third parties for any commercial purpose, including but not
            limited to AI training, market analysis, and data aggregation services.
          </>,
          <>
            You agree that your participation is linked solely to your Wallet Address. You represent that the User Data
            you submit does not contain the personal identifiable information (PII) of yourself or any third party (such
            as real names, physical addresses, or government IDs) unless explicitly requested and consented to.
          </>,
        ],
      },
    ],
  },
  {
    title: "Background",
    content: [
      {
        type: "p",
        content: [
          <>
            The CODATTA WEBSITE provides a convenient tool that allows users to scrape publicly available posts on
            Instagram by clicking a button while browsing the platform.
          </>,
          <>
            <span className="font-semibold">Important Notice:</span> ALL DATA COLLECTION, SUBMISSION, STORAGE, AND
            PROFIT-SHARING ACTIVITIES ARE CONDUCTED IN YOUR NAME. BY USING THIS WEBSITE, YOU AUTHORIZE US TO COLLECT
            PUBLICLY AVAILABLE INFORMATION BASED ON YOUR ACTIONS AND PROCESS IT IN YOUR NAME.
          </>,
        ],
      },
    ],
  },
  {
    title: "Changes to the Terms of Use",
    content: [
      {
        type: "p",
        content: [
          <>
            We may revise and update these Terms of Use from time to time in our sole discretion. All changes are
            effective immediately when we post them. However, any changes to the dispute resolution provisions set forth
            in Governing Law and Jurisdiction will not apply to any disputes for which the parties have actual notice on
            or prior to the date the change is posted on the Website.
          </>,
          <>
            Your continued use of the Website following the posting of the revised Terms of Use means that you accept
            and agree to the changes. You are expected to check this page from time to time so you are aware of any
            changes, as they are binding on you.
          </>,
        ],
      },
    ],
  },
  {
    title: "Accessing the Application and Account Security",
    content: [
      {
        type: "p",
        content: [
          <>
            We reserve the right to withdraw or amend this Application, and any service or material we provide on the
            Application, in our sole discretion without notice. We will not be liable if for any reason all or any part
            of the Application is unavailable at any time or for any period. From time to time, we may restrict access
            to some parts of the Application, or the entire Application, to users, including registered users.
          </>,
        ],
      },
      {
        type: "ul",
        des: <>You are responsible for both:</>,

        content: [
          "Making all arrangements necessary for you to have access to the Website.",
          "Ensuring that all persons who access the Website through your internet connection are aware of these Terms of Use and comply with them.",
        ],
      },
      {
        type: "p",
        content: [
          "To access the Website or some of the resources it offers, you may be asked to provide certain registration details or other information. It is a condition of your use of the Website that all the information you provide on the Website is correct, current and complete. ",
          "If you choose, or are provided with, a username, password or any other piece of information as part of our security procedures, you must treat such information as confidential, and you must not disclose it to any other person or entity. You also acknowledge that your account is personal to you and agree not to provide any other person with access to this Website or portions of it using your username, password or other security information. You agree to notify us immediately of any unauthorized access to or use of your username or password or any other breach of security. You also agree to ensure that you exit from your account at the end of each session. You should use particular caution when accessing your account from a public or shared computer so that others are not able to view or record your password or other personal information.",
          "We have the right to disable any username, password or other identifier, whether chosen by you or provided by us, at any time if, in our opinion, you have violated any provision of these Terms of Use.",
        ],
      },
    ],
  },
  {
    title: "Intellectual Property Rights",
    content: [
      {
        type: "p",
        content: [
          <>
            The Website and its entire contents, features and functionality (including but not limited to all
            information, software, text, displays, images, video and audio, and the design, selection and arrangement
            thereof), are owned by the Company, its licensors or other providers of such material and are protected by
            international copyright, trademark, patent, trade secret and other intellectual property or proprietary
            rights laws.
          </>,
        ],
      },
      {
        type: "ul",
        des: (
          <>
            These Terms of Use permit you to use the Website for your personal, non-commercial use only. You must not
            reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish,
            download, store or transmit any of the material on our Website, except as follows:
          </>
        ),
        content: [
          <>
            Your computer may temporarily store copies of such materials in RAM incidental to your accessing and viewing
            those materials.
          </>,
          <>You may store files that are automatically cached by your Web browser for display enhancement purposes.</>,
          <>
            You may print or download one copy of a reasonable number of pages of the Website for your own personal,
            non-commercial use and not for further reproduction, publication or distribution.
          </>,
          <>
            If we provide desktop, mobile or other applications for download, you may download a single copy to your
            computer or mobile device solely for your own personal, non-commercial use, provided you agree to be bound
            by our end user license agreement for such applications.
          </>,
        ],
      },
      {
        type: "p",
        content: [<>You must not:</>],
      },
      {
        type: "ul",
        content: [
          <>Modify copies of any materials from this site.</>,
          <>
            Use any illustrations, photographs, video or audio sequences or any graphics separately from the
            accompanying text.
          </>,
          <>
            Delete or alter any copyright, trademark or other proprietary rights notices from copies of materials from
            this site.
          </>,
        ],
      },
      {
        type: "p",
        content: [
          <>
            You must not access or use for any commercial purposes any part of the Website or any services or materials
            available through the Website.
          </>,
          <>
            If you print, copy, modify, download or otherwise use or provide any other person with access to any part of
            the Website in breach of the Terms of Use, your right to use the Website will cease immediately and you
            must, at our option, return or destroy any copies of the materials you have made. No right, title or
            interest in or to the Website or any content on the Website is transferred to you, and all rights not
            expressly granted are reserved by the Company. Any use of the Website not expressly permitted by these Terms
            of Use is a breach of these Terms of Use and may violate copyright, trademark and other laws.
          </>,
        ],
      },
    ],
  },
  {
    title: "Trademarks",
    content: [
      {
        type: "p",
        content: [
          <>
            The Company name, the terms, the Company logo and all related names, logos, product and service names,
            designs and slogans are trademarks of the Company or its affiliates or licensors. You must not use such
            marks without the prior written permission of the 3 Company. All other names, logos, product and service
            names, designs and slogans on this Website are the trademarks of their respective owners.
          </>,
        ],
      },
    ],
  },
  {
    title: "Prohibited Uses",
    content: [
      {
        type: "ul",
        des: (
          <>
            You may use the Website only for lawful purposes and in accordance with these Terms of Use. You agree not to
            use the Website:
          </>
        ),
        content: [
          <>
            In any way that violates any applicable law or regulation (including, without limitation, any laws regarding
            the export of data or software to and from the US or other countries).
          </>,
          <>
            For the purpose of exploiting, harming or attempting to exploit or harm minors in any way by exposing them
            to inappropriate content, asking for personally identifiable information or otherwise.
          </>,
          <>
            To send, knowingly receive, upload, download, use or re-use any material which does not comply with the
            Content Standards set out in these Terms of Use.
          </>,
          <>
            To transmit, or procure the sending of, any advertising or promotional material without our prior written
            consent, including any "junk mail," "chain letter," "spam," or any other similar solicitation.
          </>,
          <>
            To impersonate or attempt to impersonate the Company, a Company employee, another user or any other person
            or entity (including, without limitation, by using e-mail addresses associated with any of the foregoing).
          </>,
          <>
            To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Website, or
            which, as determined by us, may harm the Company or users of the Website, or expose them to liability.
          </>,
        ],
      },
      {
        type: "ul",
        des: <>Additionally, you agree not to:</>,
        content: [
          <>
            Use the Website in any manner that could disable, overburden, damage, or impair the site or interfere with
            any other party's use of the Website, including their ability to engage in real time activities through the
            Website.
          </>,
          <>
            Use any robot, spider or other automatic device, process or means to access the Website for any purpose,
            including monitoring or copying any of the material on the Website.
          </>,
          <>
            Use any manual process to monitor or copy any of the material on the Website, or for any other purpose not
            expressly authorized in these Terms of Use, without our prior written consent.
          </>,
          <>Use any device, software or routine that interferes with the proper working of the Website.</>,
          <>
            Introduce any viruses, trojan horses, worms, logic bombs or other material which is malicious or
            technologically harmful.
          </>,
          <>
            Attempt to gain unauthorized access to, interfere with, damage or disrupt any parts of the Website, the
            server on which the Website is stored, or any server, computer or database connected to the Website.
          </>,
          <>Attack the Website via a denial-of-service attack or a distributed denial-of-service attack.</>,
          <>Otherwise attempt to interfere with the proper working of the Website.</>,
        ],
      },
    ],
  },

  {
    title: "User Contributions",
    content: [
      {
        type: "p",
        content: [
          <>
            The Website may contain message boards, chat rooms, personal web pages or profiles, forums, bulletin boards,
            and other interactive features (collectively, <span className="font-semibold">"Interactive Services"</span>)
            that allow users to post, submit, publish, display or transmit to other users or other persons (hereinafter,
            <span className="font-semibold">"post"</span>) content or materials (collectively,{" "}
            <span className="font-semibold">"User Contributions"</span>) on or through the Website.
          </>,
          <>All User Contributions must comply with the Content Standards set out in these Terms of Use.</>,
          <>
            Any User Contribution you post to the site will be considered non-confidential and non- proprietary. By
            providing any User Contribution on the Website, you grant us and our affiliates and service providers, and
            each of their and our respective licensees, successors and assigns the right to use, reproduce, modify,
            perform, display, distribute and otherwise disclose to third parties any such material for any purpose.
          </>,
        ],
      },
      {
        type: "ul",
        des: "You represent and warrant that:",
        content: [
          <>
            You own or control all rights in and to the User Contributions and have the right to grant the license
            granted above to us and our affiliates and service providers, and each of their and our respective
            licensees, successors and assigns.
          </>,
          <>All of your User Contributions do and will comply with these Terms of Use.</>,
        ],
      },
      {
        type: "p",
        content: [
          <>
            You understand and acknowledge that you are responsible for any User Contributions you submit or contribute,
            and you, not the Company, have fully responsibility for such content, including its legality, reliability,
            accuracy and appropriateness.
          </>,
          <>
            We are not responsible, or liable to any third party, for the content or accuracy of any User Contributions
            posted by you or any other user of the Website.
          </>,
        ],
      },
    ],
  },
  {
    title: "Monitoring and Enforcement; Termination",
    content: [
      {
        type: "ul",
        des: "We have the right to:",
        content: [
          <>Remove or refuse to post any User Contributions for any or no reason in our sole discretion.</>,
          <>
            Take any action with respect to any User Contribution that we deem necessary or appropriate in our sole
            discretion, including if we believe that such User Contribution violates the Terms of Use, including the
            Content Standards, infringes any intellectual property right or other right of any person or entity,
            threatens the personal safety of users of the Website or the public or could create liability for the
            Company.
          </>,
          <>
            Disclose your identity or other information about you to any third party who claims that material posted by
            you violates their rights, including their intellectual property rights or their right to privacy.
          </>,
          <>
            Take appropriate legal action, including without limitation, referral to law enforcement, for any illegal or
            unauthorized use of the Website.
          </>,
          <>Terminate or suspend your access to all or part of the Website for any violation of these Terms of Use.</>,
        ],
      },
      {
        type: "p",
        content: [
          <>
            Without limiting the foregoing, we have the right to fully cooperate with any law enforcement authorities or
            court order requesting or directing us to disclose the identity or other information of anyone posting any
            materials on or through the Website. YOU WAIVE AND HOLD HARMLESS THE COMPANY AND ITS AFFILIATES, LICENSEES
            AND SERVICE PROVIDERS FROM ANY CLAIMS RESULTING FROM ANY ACTION TAKEN BY ANY OF THE FOREGOING PARTIES DURING
            OR AS A RESULT OF ITS INVESTIGATIONS AND FROM ANY ACTIONS TAKEN AS A CONSEQUENCE OF INVESTIGATIONS BY EITHER
            SUCH PARTIES OR LAW ENFORCEMENT AUTHORITIES.
          </>,
          <>
            However, we do not undertake to review material before it is posted on the Website, and cannot ensure prompt
            removal of objectionable material after it has been posted. Accordingly, we assume no liability for any
            action or inaction regarding transmissions, communications or content provided by any user or third party.
            We have no liability or responsibility to anyone for performance or nonperformance of the activities
            described in this section.
          </>,
        ],
      },
    ],
  },
  {
    title: "Content Standards",
    content: [
      {
        type: "ul",
        des: (
          <>
            These content standards apply to any and all User Contributions and use of Interactive Services. User
            Contributions must in their entirety comply with all applicable laws and regulations. Without limiting the
            foregoing, User Contributions must not:
          </>
        ),
        content: [
          <>
            Contain any material which is defamatory, obscene, indecent, abusive, offensive, harassing, violent,
            hateful, inflammatory or otherwise objectionable.
          </>,
          <>
            Promote sexually explicit or pornographic material, violence, or discrimination based on race, sex,
            religion, nationality, disability, sexual orientation or age.
          </>,
          <>
            Infringe any patent, trademark, trade secret, copyright or other intellectual property or other rights of
            any other person.
          </>,
          <>
            Violate the legal rights (including the rights of publicity and privacy) of others or contain any material
            that could give rise to any civil or criminal liability under applicable laws or regulations or that
            otherwise may be in conflict with these Terms of Use.
          </>,
          <>Be likely to deceive any person.</>,
          <>Promote any illegal activity, or advocate, promote or assist any unlawful act.</>,
          <>
            Cause annoyance, inconvenience or needless anxiety or be likely to upset, embarrass, alarm or annoy any
            other person.
          </>,
          <>Impersonate any person, or misrepresent your identity or affiliation with any person or organization.</>,
          <>
            Involve commercial activities or sales, such as contests, sweepstakes and other sales promotions, barter or
            advertising.
          </>,
          <>
            Give the impression that they emanate from or are endorsed by us or any other person or entity, if this is
            not the case.
          </>,
        ],
      },
    ],
  },
  {
    title: "Reliance on Information Posted",
    content: [
      {
        type: "p",
        content: [
          <>
            The information presented on or through the Website is made available solely for general information
            purposes. We do not warrant the accuracy, completeness or usefulness of this information. Any reliance you
            place on such information is strictly at your own risk. We disclaim all liability and responsibility arising
            from any reliance placed on such materials by you or any other visitor to the Website, or by anyone who may
            be informed of any of its contents.
          </>,
          <>
            This Website may include content provided by third parties, including materials provided by other users,
            bloggers and third-party licensors, syndicators, aggregators and/or 7 reporting services. All statements
            and/or opinions expressed in these materials, and all articles and responses to questions and other content,
            other than the content provided by the Company, are solely the opinions and the responsibility of the person
            or entity providing those materials. These materials do not necessarily reflect the opinion of the Company.
            We are not responsible, or liable to you or any third party, for the content or accuracy of any materials
            provided by any third parties.
          </>,
        ],
      },
    ],
  },
  {
    title: "User-Submitted Images",
    content: [
      {
        type: "p",
        content: [
          <>
            By submitting any images (“Images”) to the Platform, you expressly represent, warrant, and covenant that:
          </>,
          <>(a) You are the sole creator and owner of all intellectual property rights in the Images, OR</>,
          <>
            (b) You have obtained (and can provide upon request): (i) Copyright authorization from the original
            photographer (if not yourself); (ii) Trademark clearances for any branded packaging, restaurant logos, or
            proprietary dish designs depicted; (iii) Model releases for recognizable faces (if applicable); and (iv)
            Venue permissions for location-specific elements (e.g., restaurant interiors).
          </>,
          <>
            You further warrant that Images do not infringe any third-party rights under applicable laws (including but
            not limited to copyright, trademark, trade dress, or publicity rights).
          </>,
          <>
            You hereby grant Codatta a worldwide, non-exclusive, royalty-free, sublicensable, and transferable license
            to: (a) Store, reproduce, and modify Images for technical purposes (e.g., compression, format conversion);
            (b) Publicly display and distribute Images on Codatta’s social media channels, marketing materials, and
            partner platforms (including Binance), with attribution to your username unless you opt out via email to{" "}
            <a href="mailto:support@codatta.io ">support@codatta.io </a>; (c) Use Images for promotional campaigns,
            including but not limited to advertisements, contests, and derivative works (e.g., collages, filters).
          </>,
          <>This license survives account termination for content already published.</>,
          <>
            Images must NOT contain: (a) Professional photography (e.g., watermarked stock images or magazine-quality
            shots) without written proof of licensing; (b) Signature dishes protected by trade dress (e.g., McDonald’s
            Big Mac, Cronuts™); (c) Recognizable private locations (e.g., Michelin-starred restaurant interiors)
            without venue consent; (d) Third-party artistic elements (e.g., copyrighted recipes, food styling
            techniques).
          </>,
          <>
            Codatta reserves the right, but not the obligation, to: (a) Screen Images using automated tools (e.g.,
            reverse image search) prior to publication; (b) Request proof of ownership (e.g., raw image files,
            authorization emails) for any selected submission; (c) Remove or block access to allegedly infringing Images
            within 24 hours of receiving a valid DMCA notice or rights holder complaint via{" "}
            <a href="mailto:support@codatta.io ">support@codatta.io </a>.
          </>,
          <>Repeat infringers will have their accounts terminated per 17 U.S.C. § 512(i).</>,
          <>
            You agree to indemnify and hold Codatta harmless from any claims, damages, or expenses (including attorneys’
            fees) arising from: (a) Your breach of the warranties in this Section; (b) Unauthorized use of Images by
            Codatta in reliance on your representations; (c) Third-party disputes regarding rights clearance.
          </>,
          <>
            Unless you email <a href="mailto:support@codatta.io ">support@codatta.io </a> with the subject line
            “ATTRIBUTION REMOVAL REQUEST”, Codatta may credit your username when sharing Images. Removal requests will
            be processed within 7 business days but do not retract prior publications.
          </>,
        ],
      },
    ],
  },
  {
    title: "Changes to the Application",
    content: [
      {
        type: "p",
        content: [
          <>
            We may update the content on this Application from time to time, but its content is not necessarily complete
            or up to date. Any of the material on the Application may be out of date at any given time, and we are under
            no obligation to update such material.
          </>,
        ],
      },
    ],
  },
  {
    title: "Newsletter Subscription",
    content: [
      {
        type: "p",
        content: [
          <>
            By using our services or accessing our Application, you consent to being automatically subscribed to our
            newsletter, which may include updates, promotional offers, and other communications. You have the right to
            opt-out at any time by following the unsubscribe link in each email or by contacting us directly.
          </>,
          <>
            Your subscription to the newsletter will be entirely voluntary, and you can withdraw consent at any time
            without penalty.
          </>,
        ],
      },
    ],
  },
  {
    title: "Linking to the Website and Social Media Features",
    content: [
      {
        type: "p",
        content: [
          <>
            You may link to our homepage, provided you do so in a way that is fair and legal and does not damage our
            reputation or take advantage of it, but you must not establish a link in such a way as to suggest any form
            of association, approval or endorsement on our part without our express written consent.
          </>,
        ],
      },
      {
        type: "ul",
        des: "This Website may provide certain social media features that enable you to:",
        content: [
          <>Link from your own or certain third-party Websites to certain content on this Website.</>,
          <>Send e-mails or other communications with certain content, or links to certain content, on this Website.</>,
          <>
            Cause limited portions of content on this Website to be displayed or appear to be displayed on your own or
            certain third-party Websites.
          </>,
        ],
      },
      {
        type: "ul",
        des: (
          <>
            You may use these features solely as they are provided by us, solely with respect to the content they are
            displayed with, and otherwise in accordance with any additional terms and conditions we provide with respect
            to such features. Subject to the foregoing, you must not:
          </>
        ),
        content: [
          <>Establish a link from any Website that is not owned by you.</>,
          <>
            Cause the Website or portions of it to be displayed, or appear to be displayed by, for example, framing,
            deep linking or in-line linking, on any other site.
          </>,
          <>Link to any part of the Website other than the homepage.</>,
          <>
            Otherwise take any action with respect to the materials on this Website that is inconsistent with any other
            provision of these Terms of Use.
          </>,
        ],
      },
      {
        type: "p",
        content: [
          <>
            The Website from which you are linking, or on which you make certain content accessible, must comply in all
            respects with the Content Standards set out in these Terms of Use.
          </>,
          <>
            You agree to cooperate with us in causing any unauthorized framing or linking immediately to cease. We
            reserve the right to withdraw linking permission without notice.
          </>,
          <>
            We may disable all or any social media features and any links at any time without notice in our discretion.
          </>,
        ],
      },
    ],
  },
  {
    title: "Links from the Website",
    content: [
      {
        type: "p",
        content: [
          <>
            If the Website contains links to other sites and resources provided by third parties, these links are
            provided for your convenience only. This includes links contained in advertisements, including banner
            advertisements and sponsored links. We have no control over the contents of those sites or resources, and
            accept no responsibility for them or for any loss or damage that may arise from your use of them. If you
            decide to access any of the third party websites linked to this Website, you do so entirely at your own risk
            and subject to the terms and conditions of use for such websites.
          </>,
        ],
      },
    ],
  },
  {
    title: "Disclaimer of Warranties",
    content: [
      {
        type: "p",
        content: [
          <>
            You understand that we cannot and do not guarantee or warrant that files available for downloading from the
            internet or the Website will be free of viruses or other destructive code. You are responsible for
            implementing sufficient procedures and checkpoints to satisfy your particular requirements for anti-virus
            protection and accuracy of data input and output, and for maintaining a means external to our site for any
            reconstruction of any lost data. WE WILL NOT BE LIABLE FOR ANY LOSS OR DAMAGE CAUSED BY A DISTRIBUTED
            DENIAL-OF-SERVICE ATTACK, VIRUSES OR OTHER TECHNOLOGICALLY HARMFUL MATERIAL THAT MAY INFECT YOUR COMPUTER
            EQUIPMENT, COMPUTER PROGRAMS, DATA OR OTHER PROPRIETARY MATERIAL DUE TO YOUR USE OF THE WEBSITE OR ANY
            SERVICES OR ITEMS OBTAINED THROUGH THE WEBSITE OR TO YOUR DOWNLOADING OF ANY MATERIAL POSTED ON IT, OR ON
            ANY WEBSITE LINKED TO IT.
          </>,
          <>
            YOUR USE OF THE WEBSITE, ITS CONTENT AND ANY SERVICES OR ITEMS OBTAINED THROUGH THE WEBSITE IS AT YOUR OWN
            RISK. THE WEBSITE, ITS CONTENT AND ANY SERVICES OR ITEMS OBTAINED THROUGH THE WEBSITE ARE PROVIDED ON AN "AS
            IS" AND "AS AVAILABLE" BASIS, WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. 10 NEITHER THE
            COMPANY NOR ANY PERSON ASSOCIATED WITH THE COMPANY MAKES ANY WARRANTY OR REPRESENTATION WITH RESPECT TO THE
            COMPLETENESS, SECURITY, RELIABILITY, QUALITY, ACCURACY OR AVAILABILITY OF THE WEBSITE. WITHOUT LIMITING THE
            FOREGOING, NEITHER THE COMPANY NOR ANYONE ASSOCIATED WITH THE COMPANY REPRESENTS OR WARRANTS THAT THE
            WEBSITE, ITS CONTENT OR ANY SERVICES OR ITEMS OBTAINED THROUGH THE WEBSITE WILL BE ACCURATE, RELIABLE,
            ERROR-FREE OR UNINTERRUPTED, THAT DEFECTS WILL BE CORRECTED, THAT OUR SITE OR THE SERVER THAT MAKES IT
            AVAILABLE ARE FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS OR THAT THE WEBSITE OR ANY SERVICES OR ITEMS
            OBTAINED THROUGH THE WEBSITE WILL OTHERWISE MEET YOUR NEEDS OR EXPECTATIONS.
          </>,
          <>
            THE COMPANY HEREBY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, STATUTORY OR OTHERWISE,
            INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY, NON- INFRINGEMENT AND FITNESS FOR PARTICULAR
            PURPOSE.
          </>,
          <>THE FOREGOING DOES NOT AFFECT ANY WARRANTIES WHICH CANNOT BE EXCLUDED OR LIMITED UNDER APPLICABLE LAW.</>,
        ],
      },
    ],
  },
  {
    title: "Limitation on Liability",
    content: [
      {
        type: "p",
        content: [
          <>
            TO THE FULLEST EXTENT PROVIDED BY LAW, IN NO EVENT WILL THE COMPANY, ITS AFFILIATES OR THEIR LICENSORS,
            SERVICE PROVIDERS, EMPLOYEES, AGENTS, OFFICERS OR DIRECTORS BE LIABLE FOR DAMAGES OF ANY KIND, UNDER ANY
            LEGAL THEORY, ARISING OUT OF OR IN CONNECTION WITH YOUR USE, OR INABILITY TO USE, THE WEBSITE, ANY WEBSITES
            LINKED TO IT, ANY CONTENT ON THE WEBSITE OR SUCH OTHER WEBSITES OR ANY SERVICES OR ITEMS OBTAINED THROUGH
            THE WEBSITE OR SUCH OTHER WEBSITES, INCLUDING ANY DIRECT, INDIRECT, SPECIAL, INCIDENTAL, CONSEQUENTIAL OR
            PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO, PERSONAL INJURY, PAIN AND SUFFERING, EMOTIONAL DISTRESS,
            LOSS OF REVENUE, LOSS OF PROFITS, LOSS OF BUSINESS OR ANTICIPATED SAVINGS, LOSS OF USE, LOSS OF GOODWILL,
            LOSS OF DATA, AND WHETHER CAUSED BY TORT (INCLUDING NEGLIGENCE), BREACH OF CONTRACT OR OTHERWISE, EVEN IF
            FORESEEABLE.
          </>,
          <>THE FOREGOING DOES NOT AFFECT ANY LIABILITY WHICH CANNOT BE EXCLUDED OR LIMITED UNDER APPLICABLE LAW.</>,
        ],
      },
    ],
  },
  {
    title: "Indemnification",
    content: [
      {
        type: "p",
        content: [
          <>
            You agree to defend, indemnify and hold harmless the Company, its affiliates, licensors and service
            providers, and its and their respective officers, directors, employees, contractors, agents, licensors,
            suppliers, successors and assigns from and against any claims, liabilities, damages, judgments, awards,
            losses, costs, expenses or fees (including reasonable attorneys' fees) arising out of or relating to your
            violation of these Terms of Use or your use of the Website, including, but not limited to, your User
            Contributions, any use of the Website's content, services and products other than as expressly authorized in
            these Terms of Use, or your use of any information obtained from the Website.
          </>,
        ],
      },
    ],
  },
  {
    title: "Compliance Representations",
    content: [
      {
        type: "ol",
        des: "By using the Website, you represent and warrant that you:",
        content: [
          <>
            Comply with all applicable data privacy and protection laws, including but not limited to the{" "}
            <span className="font-semibold">General Data Protection Regulation (GDPR)</span>, the{" "}
            <span className="font-semibold">California Consumer Privacy Act (CCPA)</span>, and the{" "}
            <span className="font-semibold">Children’s Online Privacy Protection Act (COPPA)</span>.
          </>,
          <>
            Adhere to the provisions of the{" "}
            <span className="font-semibold">Digital Millennium Copyright Act (DMCA)</span> and do not use the Website to
            infringe upon any copyright-protected materials.
          </>,
          <>
            Respect all intellectual property laws, including but not limited to copyright, trademark, trade secret, and
            patent laws, and do not use the Website to collect or share data in violation of any intellectual property
            rights.
          </>,
          <>
            Ensure that your use of the Website does not breach any third-party terms of service, including but not
            limited to Instagram’s Terms of Use and Privacy Policy.
          </>,
        ],
      },
      {
        type: "p",
        content: [
          <>
            Failure to comply with these representations may result in immediate termination of your access to the
            Website and legal action where applicable.
          </>,
        ],
      },
    ],
  },
  {
    title: "Arbitration",
    content: [
      {
        type: "p",
        content: [
          <>
            Any claim, dispute or controversy of whatever nature arising out of or relating to this Agreement or any
            engagement or services rendered pursuant to this Agreement, including, without limitation, any action or
            claim based on tort, contract, or statute, or concerning the interpretation, effect, termination, validity,
            performance and/or breach of this Agreement or services rendered hereunder ("Claim”), shall be resolved by
            final and binding arbitration. The arbitration shall be conducted by and submitted to a single arbitrator
            ("Arbitrator") selected from and administered by the Singapore International Arbitration Centre, in
            accordance with its SIAC Rules (6th Edition, 1 August 2016); however, upon the written demand of any party
            to the arbitration, the arbitration shall be conducted by and submitted to three Arbitrators selected from
            and administered by SIAC. The seat of the arbitration shall be Singapore.
          </>,
          <>
            The Arbitrator(s) shall NOT be authorized to reform, modify or materially change this Agreement or other
            agreements entered into between the parties. Each party shall bear its own attorneys' fees, costs and
            disbursements arising out of the arbitration, and shall pay 12 an equal share of the fees and costs of the
            Arbitrator(s) and SIAC; however, the Arbitrator(s) shall be authorized to determine whether a party is the
            prevailing party and, if so, to award to that prevailing party reimbursement for its reasonable attorneys'
            fees, costs and disbursements (including, for example, expert witness fees and expenses, photocopy charges,
            travel expenses, etc.), and/or the fees and costs of the Arbitrator(s) and SIAC. The Arbitrator(s), and not
            a court, shall also be authorized to determine whether this Arbitration Provision applies to a Claim sought
            to be resolved hereunder. The Arbitrator(s) shall, within fifteen (15) calendar days after the conclusion of
            the arbitration hearing, issue a written award and a written statement of decision describing the material
            factual findings and conclusions on which the award is based, including the calculation of any damages
            awarded.
          </>,
          <>
            By agreeing to this binding Arbitration Provision, the parties understand that they are waiving certain
            rights and protections which may otherwise be available if a Claim were determined by litigation in court,
            including, without limitation, the right to seek or obtain certain types of damages precluded by this
            Arbitration Provision, the right to a jury trial, certain rights of appeal, and a right to invoke formal
            rules of procedure and evidence.
          </>,
        ],
      },
    ],
  },
  {
    title: "Limitation on Time to File Claims",
    content: [
      {
        type: "p",
        content: [
          <>
            ANY CAUSE OF ACTION OR CLAIM YOU MAY HAVE ARISING OUT OF OR RELATING TO THESE TERMS OF USE OR THE WEBSITE
            MUST BE COMMENCED WITHIN ONE (1) YEAR AFTER THE CAUSE OF ACTION ACCRUES; OTHERWISE, SUCH CAUSE OF ACTION OR
            CLAIM IS PERMANENTLY BARRED.
          </>,
        ],
      },
    ],
  },
  {
    title: "Waiver and Severability",
    content: [
      {
        type: "p",
        content: [
          <>
            No waiver of by the Company of any term or condition set forth in these Terms of Use shall be deemed a
            further or continuing waiver of such term or condition or a waiver of any other term or condition, and any
            failure of the Company to assert a right or provision under these Terms of Use shall not constitute a waiver
            of such right or provision.
          </>,
          <>
            If any provision of these Terms of Use is held by a court or other tribunal of competent jurisdiction to be
            invalid, illegal or unenforceable for any reason, such provision shall be eliminated or limited to the
            minimum extent such that the remaining provisions of the Terms of Use will continue in full force and
            effect.
          </>,
        ],
      },
    ],
  },
  {
    title: "Entire Agreement",
    content: [
      {
        type: "p",
        content: [
          <>
            The Terms of Use constitute the sole and entire agreement between you and CODATTA WEBSITE with respect to
            the Website and supersede all prior and contemporaneous understandings, agreements, representations and
            warranties, both written and oral, with respect to the Website.
          </>,
        ],
      },
    ],
  },
  {
    title: "Your Comments and Concerns",
    content: [
      {
        type: "p",
        content: [
          <>This Application is operated by CODATTA.</>,
          <>
            All other feedback, comments, requests for technical support and other communications relating to the
            Application should be directed to: <a href="mailto:support@codatta.io">support@codatta.io</a>.
          </>,
        ],
      },
    ],
  },
];

export default function Page() {
  return (
    <div className="bg-warm p-4 pt-6 font-sora text-xs leading-5 text-black md:pt-[150px] md:text-base md:leading-8">
      <div className="mx-auto max-w-[1120px]">
        <h1 className="font-inter mb-5 text-center text-2xl font-bold md:mb-[60px] md:text-[68px] md:leading-[96px]">
          Terms of Use
        </h1>
        <p className="">Last Modified: December 5, 2025</p>
        <div className="my-4 space-y-4 md:my-5 md:space-y-5">
          {data.map((item, index) => (
            <>
              <h2 className="font-inter text-base font-bold md:text-2xl">{item.title}</h2>
              {item.content.map((content, index2) => (
                <div key={"content" + index + "-" + index2}>
                  {content.type === "p" ? (
                    <div className="space-y-5">
                      {content.content.map((item, index3) => (
                        <p key={"content" + index + "-" + index2 + "-" + index3}>{item}</p>
                      ))}
                    </div>
                  ) : content.type === "ul" ? (
                    <>
                      {content.des && <p className="mb-4 md:mb-5">{content.des}</p>}
                      <ul className="list-inside list-disc">
                        {content.content.map((item, index3) => (
                          <li key={"content" + index + "-" + index2 + "-" + index3}>{item}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <>
                      {content.des && <p className="mb-4 md:mb-5">{content.des}</p>}
                      <ol className="list-inside list-decimal">
                        {content.content.map((item, index3) => (
                          <li key={"content" + index + "-" + index2 + "-" + index3}>{item}</li>
                        ))}
                      </ol>
                    </>
                  )}
                </div>
              ))}
            </>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

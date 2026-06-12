import Footer from "@/components/v3/footer/index";

type ContentItem = {
  type: "p" | "ul" | "ol";
  des?: string | React.ReactNode;
  content: (React.ReactNode | string)[];
};

const data: { title: string; content: ContentItem[] }[] = [
  {
    title: "",
    content: [
      {
        type: "p",
        content: [
          "CODATTA takes your privacy seriously. Please read the following to learn more about our Privacy Policy. Any and all use or access of the Extension is subject to the collection, use, and sharing of your information as described in this Privacy Policy.",
        ],
      },
    ],
  },
  {
    title: "What does this Privacy Policy cover?",
    content: [
      {
        type: "p",
        content: [
          <>
            This Privacy Policy covers our treatment of personally identifiable information (
            <span className="font-semibold">“Personal Information”</span> ) that we gather when you are accessing or
            using our Extension. It does not apply to the practices of companies we don’t own or control, or people that
            we don’t manage, even if they are accessed from or through the Extension. We may gather various types of
            Personal Information from our users, as explained in more detail below, and we use this Personal Information
            internally in connection with our Extension, including to personalize, provide, and improve our services, to
            fulfill your requests for certain products and services, and to analyze how you use the Extension. In
            certain circumstances, we may also share some Personal Information with third parties and in some
            circumstances, Personal Information may be made publicly available, but only as described below.
          </>,
          <>
            If you are under the age of majority in your jurisdiction of residence, you may use the Extension only with
            the consent of or under the supervision of your parent or legal guardian. We do not intentionally gather
            Personal Information from users who are under the age of 13. Consistent with the requirements of the
            Children's Online Privacy Protection Act (COPPA), if we learn that we have received any information directly
            from a child under age 13 without first receiving his or her parent's verified consent, we will use that
            information only to respond directly to that child (or his or her parent or legal guardian) to inform the
            child that he or she cannot use our Extension and subsequently we will delete that information.
          </>,
        ],
      },
    ],
  },
  {
    title: "Will CODATTA change this Privacy Policy?",
    content: [
      {
        type: "p",
        content: [
          "We're constantly trying to improve our Extension, including how we approach privacy matters, so we may need to change this Privacy Policy from time to time. Updates to this Privacy Policy will be posted on this page no later than the effective date of the updates. We may, but may not always, provide advanced notice or otherwise affirmatively notify of changes to this Privacy Policy. If you use the Extension after any changes to the Privacy Policy have been posted, that use or access is subject to the updated terms of this Privacy Policy. Collection and use of Personal Information is subject to the Privacy Policy in effect at the time the information is collected or used.",
        ],
      },
    ],
  },
  {
    title: "What Information does CODATTA Collect?",
    content: [
      {
        type: "ul",
        des: (
          <>
            <span className="font-semibold">Information You Provide to Us:</span> We receive and store any information
            you knowingly or voluntarily provide to us. For example, this includes information you provide when you
            connect a Wallet such as information regarding your transaction history on a Network, information you
            provide each time you wish to make a transfer of Virtual Assets through the Extension, or usage information,
            such as information about how you use the Site and interact with us. Additionally, we may collect:
          </>
        ),
        content: [
          <>
            Browser Plugin: Browser Fingerprint: Collected when you open the app for user identification and product
            data analysis. This collection is mandatory and the information cannot be cleared. Wallet Address and
            Transactions: Collected during transaction risk interception, mandatory for analysis, and cannot be cleared.
            However, transaction data can be turned off in the settings and cleared. Dapp Domain Visits: Collected when
            transaction risk interception detects danger, mandatory for marking risky websites and cannot be cleared.
          </>,
          <>
            Mobile App: Device ID: Collected upon app launch for user identification and product data analysis,
            mandatory and cannot be cleared. Wallet Address: Collected when you connect your wallet within the app,
            mandatory for product data analysis and cannot be cleared. Transactions and Dapp Domain Visits: Collected
            during transaction risk interception, not mandatory and can be turned off and cleared.
          </>,
          <>
            Dashboard Website: Wallet Address: Collected when you connect your wallet to record user subscription
            entitlements, mandatory and cannot be cleared. User Email: Collected when you add a subscription email for
            wallet address updates, not mandatory and can be cleared.
          </>,
        ],
      },
      {
        type: "p",
        content: [
          <span className="font-semibold">
            This information is necessary for the operation of our services, to personalize your experience, and to
            ensure the security of your transactions. By connecting your Wallet and using our Sites, you acknowledge
            that your transaction history and other associated information will be accessible to us and may also be
            publicly available as required by the nature of the Networks.
          </span>,
          <>
            <span className="font-semibold">Information Collected Automatically:</span> Whenever you interact with
            certain parts of our Extension such as our Site or Site, we automatically receive and record information on
            our server logs from your browser or device, which may include your IP address, geolocation data, device
            identification, “cookie” information, the type of browser and/or device you’re using to access our Sites,
            and the page or feature you requested.
          </>,
          <>
            We typically collect this information through a variety of tracking technologies, including cookies,
            embedded scripts, web beacons, file information, device IDs or fingerprints, and similar technology
            (collectively, <span className="font-semibold">“tracking technologies”</span>).{" "}
            <span className="font-semibold">“Cookies”</span> are identifiers we transfer to your browser or device that
            allow us to recognize your browser or device and tell us how and when pages and features in our Site are
            visited and by how many people. You may be able to change the preferences on your browser or device to
            prevent or limit your device’s acceptance of cookies, but this may prevent you from taking advantage of some
            of our features. If you click on a link to a third-party website or service, such third party may also
            transmit tracking technologies to you. Again, this Privacy Policy does not cover the use of tracking
            technologies by any third parties, and we aren’t responsible for their privacy policies and practices.
            Please be aware that tracking technologies placed by third parties may continue to track your activities
            online even after you have left our Sites.
          </>,
          <>
            We may use this data to customize content for you that we think you might like, based on your usage
            patterns. We may also use it to improve the Extension - for example, this data can tell us how often users
            use a particular feature of the Sites, and we can use that knowledge to make the Extension interesting to as
            many users as possible.
          </>,
          <>
            THIS INFORMATION IS NECESSARY FOR THE OPERATION OF OUR SERVICES, TO PERSONALIZE YOUR EXPERIENCE, AND TO
            ENSURE THE SECURITY OF YOUR TRANSACTIONS. BY CONNECTING YOUR WALLET AND USING OUR SITES, YOU ACKNOWLEDGE
            THAT YOUR TRANSACTION HISTORY AND OTHER ASSOCIATED INFORMATION WILL BE ACCESSIBLE TO US AND MAY ALSO BE
            PUBLICLY AVAILABLE AS REQUIRED BY THE NATURE OF THE NETWORKS.
          </>,
        ],
      },
    ],
  },
  {
    title: "How does CODATTA Use the Personal Information it Receives?",
    content: [
      {
        type: "p",
        content: [
          <>
            As a general policy, we aim to protect your privacy and Personal Information by collecting, using or sharing
            as little Personal Information as possible in order to provide our Extension unless you explicitly agree in
            writing to additional collection, use or sharing.
          </>,
          <>
            To the extent we do use Personal Information, we use such information to provide and improve the Sites,
            optimize our technology, refine the experience of our users, and innovate ways to forward our mission.
          </>,
        ],
      },
      {
        type: "ul",
        des: "Namely, we use the information we collect to:",
        content: [
          <>
            Administer the Sites, enable you to use the Protocol and other Web3 Teches, and improve your overall user
            experience;
          </>,
          <>
            To send information including Network transaction confirmations, technical notices, updates, security
            alerts, and support and administrative messages;
          </>,
          <>To respond to comments and questions and provide customer service;</>,
          <>
            Analyze how users use the Extension to help us optimize the Extension and know if there are problems with
            the Sites;
          </>,
          <>To protect, investigate, and deter against fraudulent, unauthorized, or illegal activity;</>,
          <>With your consent, to link or combine user information with other Personal Information;</>,
          <>To provide and deliver products and services requested by customers; </>,
          <>
            As disclosed below under the section of this Privacy Policy entitled “Will CODATTA Share Any of the Personal
            Information it Receives?”
          </>,
        ],
      },
      {
        type: "p",
        content: [
          <>
            We may create records from data, including aggregated and de-identified data, that is not associated with or
            linked to your Personal Information (“Anonymous Data”) by excluding information (such as your name) that
            makes the data personally identifiable to you. We use this Anonymous Data to analyze request and usage
            patterns so that we may enhance the content of our Extension and improve our Sites.
          </>,
        ],
      },
    ],
  },
  {
    title: "Will CODATTA Share Any of the Personal Information it Receives?",
    content: [
      {
        type: "ul",
        des: (
          <>
            We do not share or sell the Personal Information that you provide us with other organizations without your
            express consent, except as described in this Privacy Policy. We may share your Personal Information with
            third parties as described below:
          </>
        ),
        content: [
          <>
            <span className="font-semibold">Consent:</span> We may share Personal Information with your explicit
            consent.
          </>,
          <>
            <span className="font-semibold">Affiliated Businesses:</span> In certain situations, businesses or
            third-party websites we’re affiliated with may sell or provide products or services to you through or in
            connection with the Extension (either alone or jointly with us). You can recognize when an affiliated
            business is associated with such a transaction or service, and we will share your Personal Information with
            that affiliated business only to the extent that it is related to such transaction or service. We have no
            control over the policies and practices of third-party websites or businesses as to privacy or anything
            else, so if you choose to take part in any transaction or service relating to an affiliated website or
            business, please review all of these business’ or websites’ policies and terms, as your use of their
            services will be governed by such policies and terms.
          </>,
          <>
            <span className="font-semibold">Our Agents:</span> We employ other companies and people to perform tasks on
            our behalf and need to share your information with them to provide products or services to you or to us.
            Unless we tell you differently, our agents do not have any right to use the Personal Information we share
            with them beyond what is necessary to assist us.
          </>,
          <>
            <span className="font-semibold">Business Transfers:</span> We may choose to buy or sell assets and may share
            and/or transfer customer information in connection with the evaluation of and entry into such transactions.
            Also, if we (or our assets) are acquired, or if we go out of business, enter bankruptcy, or go through some
            other change of control, Personal Information could be one of the assets transferred to or acquired by a
            third party.
          </>,
          <>
            <span className="font-semibold">Third-Party Sites:</span> We may use third-party services, such as Google
            Analytics, to grow our business, to improve and develop our Sites, to monitor and analyze use of our Sites,
            to aid our technical administration, to increase the functionality and user-friendliness of our Sites, and
            to verify that users have the authorization needed for us to process their requests. These services may
            collect and retain some information about you, such as the IP address assigned to you on the date you use
            the Sites, but not your name or other personally identifying information. We may combine the information
            generated through the use of these services with your Personal Information but never in a way that will
            identify you to any other user or third party. Although these services may plant a persistent cookie on your
            web browser to identify you as a unique user the next time you use the Sites, the cookie cannot be used by
            anyone but Google. These services’ ability to use and share information about your use of the Extension is
            restricted by the Google Analytics Terms of Site and the Google Privacy Policy. You may find additional
            information about Google Analytics at https://google.com/policies/privacy/partners/. You can opt out of
            Google Analytics by visiting https://tools.google.com/dlpage/gaoptout/.
          </>,
          <>
            <span className="font-semibold">Protection of CODATTA and Others:</span> We reserve the right to access,
            read, preserve, and disclose any information that we believe is necessary to comply with law or court order;
            enforce or apply our Terms of Site and other agreements; or protect the rights, property, or safety of
            CODATTA, our employees, our users, or others.
          </>,
        ],
      },
      {
        type: "p",
        content: [
          <>
            We generally seek to share only Anonymous Data where possible, and we will not share such Personal
            Information in a manner that can be used to identify you individually or in a manner that provides more
            Personal Information than is publicly available (if applicable) unless otherwise explicitly agreed by you
            (either under this Privacy Policy or in another written agreement) or instructed by you. We reserve the
            right to use Anonymous Data for any purpose and to disclose Anonymous Data to third parties without
            restriction.
          </>,
        ],
      },
    ],
  },
  {
    title: "Is Personal Information about me secure?",
    content: [
      {
        type: "p",
        content: [
          <>
            We endeavor to protect the privacy of the Personal Information we hold in our records, but unfortunately, we
            cannot guarantee complete security. The safety and security of your Personal Information also depends on
            you. Unauthorized entry or use, hardware or software failure, and other factors, may compromise the security
            of user information at any time. Your Wallet is protected by your password, private key, and/or seed phrase,
            and we urge you to take steps to keep this and other Personal Information safe by not disclosing your
            security credentials to CODATTA or other, or leaving your Wallet open in an insecure manner. CODATTA
            protects your Personal Information from potential security breaches by implementing certain technological
            security measures including encryption, firewalls and secure socket layer technology. We also seek to
            protect Personal Information by refraining from collecting Personal Information where possible. However,
            these measures do not guarantee that your Personal Information will not be accessed, disclosed, altered or
            destroyed by breach of such firewalls and secure server software. By using our Sites, you acknowledge that
            you understand and agree to assume these risks.
          </>,
          <span className="font-semibold">
            WE DO NOT STORE YOUR WALLET PASSWORD, PRIVATE KEY, OR SEED PHRASE TO YOUR WALLET.
          </span>,
          <>
            We may use any aggregated data derived from or incorporating your Personal Information after you update or
            delete it, but not in a manner that would identify you personally.
          </>,
          <span className="font-semibold">EU RESIDENTS</span>,
          <>
            If you are a resident of the European Economic Area (<span className="font-semibold">“EEA”</span>) or
            Switzerland, you may have additional rights under the General Data Protection Regulation (the{" "}
            <span className="font-semibold"> “GDPR”</span>) and other applicable law with respect to your Personal Data,
            as outlined below.
          </>,
          <>
            For this section, we use the terms <span className="font-semibold">“Personal Data”</span> and{" "}
            <span className="font-semibold">“processing”</span> as they are defined in the GDPR, but{" "}
            <span className="font-semibold">“Personal Data”</span> generally means information that can be used to
            individually identify a person, and <span className="font-semibold">“processing”</span> generally covers
            actions that can be performed in connection with data such as collection, use, storage and disclosure.
            CODATTA will be the controller of your Personal Data processed in connection with the Sites.
          </>,
          <>
            If there are any conflicts between this section and any other provision of this Privacy Policy, the policy
            or portion that is more protective of Personal Data shall control to the extent of such conflict. If you
            have any questions about this section or whether any of the following applies to you, please contact us at{" "}
            <a href="mailto:support@codatta.io ">support@codatta.io </a>.
          </>,
        ],
      },
    ],
  },
  {
    title: "What Personal Data Do We Collect from You?",
    content: [
      {
        type: "ul",
        des: "We collect Personal Data about you when you provide such information directly to us, when third parties such as our business partners or service providers provide us with Personal Data about you, or when Personal Data about you is automatically collected in connection with your use of our Sites.",
        content: [
          <>
            <span className="font-semibold">Information we collect directly from you:</span> We receive Personal Data
            directly from you when you provide us with such Personal Data, including without limitation, Personal
            Information as described above under “Information You Provide to Us” and “Information Collected from Other
            Sources”, and any other information you may elect to submit in your communications with us while using our
            Sites.
          </>,
          <>
            <span className="font-semibold">Information we automatically collect when you use our Sites:</span> Some
            Personal Data is automatically collected when you use our Sites, including without limitation, the
            information described above under “Information Collected Automatically.”
          </>,
        ],
      },
    ],
  },
  {
    title: "How Do We Use Your Personal Data?",
    content: [
      {
        type: "p",
        content: [
          <>
            We process Personal Data to operate, improve, understand and personalize our Sites. See “How does CODATTA
            Use the Personal Information it Receives?” for more information on how we use your Personal Data.
          </>,
        ],
      },
      {
        type: "ul",
        des: "We will only process your Personal Data if we have a lawful basis for doing so. Lawful bases for processing include consent, contractual necessity and our “legitimate interests” or the legitimate interest of others, as further described below.",
        content: [
          <>
            <span className="font-semibold">Contractual Necessity:</span> We process certain Personal Data as a matter
            of “contractual necessity”, meaning that we need to process the data to perform under our Terms of Site with
            you, which enables us to provide you with the Site. When we process data due to contractual necessity,
            failure to provide such Personal Data will result in your inability to use some or all portions of the
            Extension that require such data.
          </>,
          <>
            <span className="font-semibold">Legitimate Interest:</span> We may also process your Personal Data where it
            is necessary for our legitimate interests (or those of a third party) and your interests and fundamental
            rights do not override those interests. We consider and balance any potential impacts on you (both positive
            and negative) and your rights before we process your Personal Data for our legitimate interests. We do not
            use your Personal Data for activities where our interests are overridden by any adverse impact on you
            (unless we have your consent or are otherwise required or permitted to by law). Examples of these legitimate
            interests include, operation and improvement of our business, products and Sites, provision of customer
            support, protection from fraud or security threats, compliance with legal obligations or completion of
            corporate transactions.
          </>,
          <>
            <span className="font-semibold">Consent:</span> In some cases, we process Personal Data based on the consent
            you expressly grant to us at the time we collect such data. When we process Personal Data based on your
            consent, it will be expressly indicated to you at the point and time of collection.
          </>,
          <>
            <span className="font-semibold">Other Processing Grounds:</span> From time to time we may also need to
            process Personal Data to comply with a legal obligation, if it is necessary to protect the vital interests
            of you or other data subjects, or if it is necessary for a task carried out in the public interest.
          </>,
        ],
      },
    ],
  },
  {
    title: "How and With Whom Do We Share Your Personal Data?",
    content: [
      {
        type: "p",
        content: [
          <>
            We may share Personal Data with our agents, third-party service providers who work on our behalf and provide
            us with services related to the purposes described in this Privacy Policy or our Terms of Site, potential
            business partners in connection with business transfers described in this Privacy Policy, or for legal
            purposes. Please see “Will CODATTA Share Any of the Personal Information it Receives?” for more information.
          </>,
        ],
      },
    ],
  },
  {
    title: "How Long Do We Retain Your Personal Data?",
    content: [
      {
        type: "p",
        content: [
          <>
            We retain Personal Data about you for as long as necessary to provide you Sites. In some cases, we retain
            Personal Data for longer, if doing so is necessary to comply with our legal obligations, resolve disputes or
            collect fees owed, or is otherwise permitted or required by applicable law, rule or regulation. Afterwards,
            we may retain some information in a depersonalized or aggregated form but not in a way that would identify
            you personally and would not constitute Personal Data.
          </>,
        ],
      },
    ],
  },
  {
    title: "What Security Measures Do We Use?",
    content: [
      {
        type: "p",
        content: [
          <>
            We seek to protect Personal Data using appropriate technical and organizational measures based on the type
            of Personal Data and applicable processing activity, and, where possible, we refrain from collecting
            Personal Data. For example, CODATTA does not collect private key data associated with your Wallet. We secure
            the Personal Data you provide in a controlled, secure environment and protected from unauthorized access.
            CODATTA audits its system for any possible security vulnerabilities to safeguard Personal Data. CODATTA
            protects the security of your information during transmission by using Transport Layer Security (TSL/SSL),
            which encrypts all information that you input. However, your private key is the key to your Wallet. If you
            do share your private key or your Personal Data with others that enables them to access your private key,
            you remain responsible for all actions taken in the name of your Wallet. If you lose control of your private
            key, you may lose control over your Wallet or your Personal Data and may be subject to legally binding
            actions taken of your behalf.
          </>,
        ],
      },
    ],
  },
  {
    title: "What Rights Do You Have Regarding Your Personal Data?",
    content: [
      {
        type: "ul",
        des: (
          <>
            You have certain rights with respect to your Personal Data, including those set forth below. For more
            information about these rights, or to submit a request, please email{" "}
            <a href="mailto:support@codatta.io ">support@codatta.io </a>. Please note that in some circumstances, we may
            not be able to fully comply with your request, such as if it is frivolous or extremely impractical, if it
            jeopardizes the rights of others, or if it is not required by law, but in those circumstances, we will still
            respond to notify you of such a decision. In some cases, we may also need to you to provide us with
            additional information, which may include Personal Data, if necessary, to verify your identity and the
            nature of your request.
          </>
        ),
        content: [
          <>
            <span className="font-semibold">Access:</span> You can request more information about the Personal Data we
            hold about you and request a copy of such Personal Data. You can also access certain of your Personal Data
            by visiting the Site.
          </>,
          <>
            <span className="font-semibold">Rectification:</span> If you believe that any Personal Data we are holding
            about you is incorrect or incomplete, you can request that we correct or supplement such data. You can
            correct some of this information directly by editing them on the Site.
          </>,
          <>
            <span className="font-semibold">Erasure:</span> You can request that we erase some or all your Personal Data
            from our systems, provided that this will not erase any Personal Data you have submitted to the Network.
          </>,
          <>
            <span className="font-semibold">Withdrawal of Consent:</span> If we are processing your Personal Data based
            on your consent (as indicated at the time of collection of such data), you have the right to withdraw your
            consent at any time. Please note that if you exercise this right, you may have to then provide express
            consent on a case-by-case basis for the use or disclosure of certain of your Personal Data, if such use or
            disclosure is necessary to enable you to utilize some or all of our Sites.
          </>,
          <>
            <span className="font-semibold">Portability:</span> You can ask for a copy of your Personal Data in a
            machine-readable format. You can also request that we transmit the data to another controller where
            technically feasible.
          </>,
          <>
            <span className="font-semibold">Objection:</span> You can contact us to let us know that you object to the
            further use or disclosure of your Personal Data for certain purposes.
          </>,
          <>
            <span className="font-semibold">Restriction of Processing:</span> You can ask us to restrict further
            processing of your Personal Data.
          </>,
          <>
            <span className="font-semibold">Right to File Complaint:</span> You have the right to lodge a complaint
            about CODATTA’s practices with respect to your Personal Data with the supervisory authority of your country
            or European Union Member State.
          </>,
        ],
      },
    ],
  },
  {
    title: "Transfers of Personal Data",
    content: [
      {
        type: "p",
        content: [
          <>
            Certain of the Extension are hosted and operated in part in the United States (
            <span className="font-semibold">“U.S.”</span>) through CODATTA and its service providers, and if you do not
            reside in the U.S., laws in the U.S. may differ from the laws where you reside. By using the Extension and
            providing your information, you acknowledge that any Personal Data about you, regardless of whether provided
            by you or obtained from a third party, may be provided to CODATTA in the U.S. and may be hosted on U.S.
            servers. You hereby consent to and authorize CODATTA to transfer, store and process your information to and
            in the U.S., and possibly other countries. We will take all steps reasonably necessary to ensure that your
            information is treated securely and in accordance with this Policy. One such step we may take to ensure the
            security of your Personal Information in the event that a transfer may not be subject to the same protection
            in the EEA or Switzerland, is to enter into specific contract clauses approved by the European Commission
            which ensure your personal information is given the same protection it has in Europe.
          </>,
        ],
      },
    ],
  },
  {
    title: "What If You Have Questions Regarding Your Personal Data?",
    content: [
      {
        type: "p",
        content: [
          <>
            {" "}
            If you have any questions about this section or our data practices generally, please contact us via{" "}
            <a href="mailto:support@codatta.io ">support@codatta.io </a>.
          </>,
          <span className="font-semibold">CALIFORNIA RESIDENTS</span>,
          <>
            Under California Civil Code Sections 1798.83-1798.84, California residents are entitled to contact us to
            prevent disclosure of Personal Information to third parties for such third parties’ direct marketing
            purposes; in order to submit such a request, please contact us at{" "}
            <a href="mailto:support@codatta.io ">support@codatta.io </a>.
          </>,
        ],
      },
    ],
  },
  {
    title: "What if I have questions about this policy?",
    content: [
      {
        type: "p",
        content: [
          <>
            If you have any questions or concerns regarding our privacy policies, please send us a detailed message to{" "}
            <a href="mailto:support@codatta.io ">support@codatta.io </a>, and we will try to resolve your concerns.
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
          PRIVACY POLICY
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

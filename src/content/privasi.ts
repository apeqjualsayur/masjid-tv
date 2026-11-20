// Privacy notice text (PRD §10), BM and EN. Content, not UI chrome: kept here instead of the i18n
// files so the whole notice can be reviewed (and replaced) in one place. DRAFT until reviewed.

export const CONTACT_EMAIL = "hubungi@masjidview.my";
export const UPDATED = "2026-10-23";

export interface PrivacySection {
  heading: string;
  body?: string[];
  list?: string[];
}
export interface PrivacyText {
  draft: string;
  title: string;
  intro: string;
  sections: PrivacySection[];
  updated: string;
  back: string;
}

export const PRIVACY: Record<"ms" | "en", PrivacyText> = {
  ms: {
    draft: "DRAF — perlu semakan. Notis ini belum disemak oleh peguam atau pegawai perlindungan data dan boleh berubah sebelum perintis.",
    title: "Notis Privasi",
    intro:
      "Masjid View ialah perkhidmatan untuk memaparkan waktu solat dan pengumuman di skrin TV masjid dan surau. Notis ini menerangkan data peribadi yang kami simpan, sebabnya, berapa lama, dan cara meminta data dipadam, selaras dengan Akta Perlindungan Data Peribadi 2010 (PDPA).",
    sections: [
      {
        heading: "Data yang kami simpan",
        list: [
          "Pentadbir masjid (AJK): nama, alamat e-mel (daripada akaun Google atau pautan log masuk e-mel) dan pilihan bahasa.",
          "Maklumat masjid atau surau: nama, alamat, nombor telefon untuk dihubungi, negeri, daerah, zon waktu solat dan logo.",
          "Kandungan yang dimasukkan oleh AJK: pengumuman, kuliah, program, poster dan notis kematian, termasuk nama si mati dan butiran jenazah.",
          "Skrin TV: nama skrin, tema, masa skrin terakhir dihubungi, dan kod pasangan sementara. Kod rahsia peranti disimpan dalam bentuk cincang (hash) sahaja.",
          "Keselamatan: rekod cubaan memasukkan kod pasangan yang salah.",
        ],
      },
      {
        heading: "Data yang kami tidak kumpul",
        body: ["Tiada kuki pengiklanan, tiada analitik pihak ketiga, dan tiada data lokasi disimpan. Butang \u201cGuna lokasi saya\u201d hanya digunakan sekali di peranti anda untuk mencari zon waktu solat; koordinat tidak disimpan."],
      },
      {
        heading: "Kenapa kami menyimpannya",
        list: [
          "Untuk membolehkan AJK log masuk dan mengurus paparan masjid mereka.",
          "Untuk menyemak dan meluluskan pendaftaran masjid, dan menghubungi AJK tentang pendaftaran atau akaun.",
          "Untuk memaparkan kandungan yang diterbitkan pada skrin TV masjid itu, termasuk semasa tiada internet.",
          "Untuk melindungi perkhidmatan daripada penyalahgunaan (contohnya meneka kod pasangan).",
        ],
      },
      {
        heading: "Siapa yang boleh melihat data",
        list: [
          "Pentadbir masjid itu sendiri (maksimum dua orang).",
          "Pemilik platform Masjid View, untuk menyemak pendaftaran dan memberi sokongan.",
          "Kandungan yang diterbitkan dipaparkan di skrin TV masjid dan boleh dilihat oleh orang ramai di masjid. Logo dan poster disimpan pada pautan rawak yang tidak disenaraikan di mana-mana.",
          "Penyedia perkhidmatan yang kami gunakan: Supabase (pangkalan data dan storan fail), Cloudflare (laman web), Google (log masuk) dan Resend (e-mel). Mereka memproses data bagi pihak kami sahaja.",
        ],
      },
      {
        heading: "Berapa lama data disimpan",
        list: [
          "Notis kematian: dipadam secara automatik 30 hari selepas tarikh tamat paparan.",
          "Pengumuman dan poster lain: sehingga AJK memadamnya.",
          "Kod pasangan TV: dipadam selepas 30 hari; cubaan kod yang salah: selepas 1 hari; jemputan pentadbir yang tidak diterima: 30 hari selepas luput.",
          "Akaun dan maklumat masjid: selagi masjid menggunakan perkhidmatan, atau sehingga diminta padam.",
          "Salinan sandaran (backup) yang disulitkan disimpan sehingga 90 hari, kemudian dipadam secara automatik.",
        ],
      },
      {
        heading: "Hak anda dan permintaan memadam data",
        body: [
          "AJK boleh membetulkan atau memadam kandungan pada bila-bila masa dalam aplikasi.",
          `Untuk mendapatkan salinan data anda, membetulkannya, atau memadam akaun dan data masjid, hantar e-mel ke ${CONTACT_EMAIL} daripada alamat e-mel akaun anda. Nyatakan nama masjid. Kami akan membalas dalam masa 21 hari dan memadam data dalam masa 30 hari (kecuali salinan sandaran, yang luput sendiri dalam masa 90 hari).`,
          "Waris atau keluarga yang mahu notis kematian diturunkan lebih awal boleh menghubungi AJK masjid berkenaan atau e-mel kami.",
        ],
      },
      {
        heading: "Hubungi kami",
        body: [`E-mel: ${CONTACT_EMAIL}`],
      },
    ],
    updated: "Kemas kini terakhir",
    back: "Kembali ke log masuk",
  },
  en: {
    draft: "DRAFT \u2014 needs review. This notice has not yet been reviewed by a lawyer or data protection officer and may change before the pilot.",
    title: "Privacy Notice",
    intro:
      "Masjid View is a service that shows prayer times and announcements on TV screens in masjids and suraus. This notice explains what personal data we keep, why, for how long, and how to ask for it to be deleted, in line with Malaysia\u2019s Personal Data Protection Act 2010 (PDPA).",
    sections: [
      {
        heading: "Data we keep",
        list: [
          "Masjid administrators (AJK): name, e-mail address (from the Google account or e-mail sign-in link) and language preference.",
          "Masjid or surau details: name, address, contact phone number, state, district, prayer-time zone and logo.",
          "Content entered by the AJK: announcements, talks, programmes, posters and death notices, including the name of the deceased and funeral details.",
          "TV screens: screen name, theme, when the screen last connected, and temporary pairing codes. Device secrets are stored only as a hash.",
          "Security: a record of wrong pairing-code attempts.",
        ],
      },
      {
        heading: "Data we do not collect",
        body: ["No advertising cookies, no third-party analytics, and no location data is stored. The \u201cUse my location\u201d button is used once on your device to find the prayer-time zone; the coordinates are not stored."],
      },
      {
        heading: "Why we keep it",
        list: [
          "To let the AJK sign in and manage their masjid\u2019s display.",
          "To review and approve masjid registrations, and to contact the AJK about their registration or account.",
          "To show published content on that masjid\u2019s TV screens, including when there is no internet.",
          "To protect the service from abuse (for example guessing pairing codes).",
        ],
      },
      {
        heading: "Who can see the data",
        list: [
          "The masjid\u2019s own administrators (at most two people).",
          "The Masjid View platform owner, to review registrations and give support.",
          "Published content is shown on the masjid\u2019s TV screens and can be seen by people at the masjid. Logos and posters are stored at random, unlisted links.",
          "The service providers we use: Supabase (database and file storage), Cloudflare (website), Google (sign-in) and Resend (e-mail). They process data only on our behalf.",
        ],
      },
      {
        heading: "How long data is kept",
        list: [
          "Death notices: deleted automatically 30 days after their display end date.",
          "Other announcements and posters: until the AJK deletes them.",
          "TV pairing codes: deleted after 30 days; wrong code attempts: after 1 day; unaccepted administrator invitations: 30 days after they expire.",
          "Accounts and masjid details: as long as the masjid uses the service, or until deletion is requested.",
          "Encrypted backup copies are kept for up to 90 days, then deleted automatically.",
        ],
      },
      {
        heading: "Your rights and deletion requests",
        body: [
          "The AJK can correct or delete content at any time in the app.",
          `To get a copy of your data, correct it, or delete the account and masjid data, e-mail ${CONTACT_EMAIL} from your account\u2019s e-mail address and give the masjid\u2019s name. We will reply within 21 days and delete the data within 30 days (except backup copies, which expire on their own within 90 days).`,
          "Families who want a death notice taken down earlier can contact the masjid\u2019s AJK or e-mail us.",
        ],
      },
      {
        heading: "Contact us",
        body: [`E-mail: ${CONTACT_EMAIL}`],
      },
    ],
    updated: "Last updated",
    back: "Back to sign in",
  },
};
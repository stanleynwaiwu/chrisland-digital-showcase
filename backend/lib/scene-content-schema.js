/**
 * Phase 16 — what is editable on each of the ten original scenes.
 *
 * The scenes themselves stay code-defined (layout, timeline, animation).
 * This file only describes the CONTENT they already show: which text
 * fields, which lists, which media slots. The `default` values are the
 * text currently written in each scene file, so the admin editor can show
 * what the display shows today. The scene files keep the same literals as
 * their built-in fallback (offline / no override). scripts/ checks that the
 * two stay in step (see the Phase 16 test notes).
 *
 * Nothing here can create, delete or restructure a scene.
 *
 * Field spec: { key, label, max, default, hint? }
 * List spec:  { key, label, itemFields:[{key,label,max}], defaults:[{...}],
 *               variable:false  -> fixed count (the scene's timeline is built
 *                                  around it): items can be edited only
 *               variable:true, min, max -> items may be added/removed/reordered }
 * Media spec: { slot, label, accepts:['image'|'video'] } — `slot` equals the key
 *             in js/media-library.js, so the original asset stays the default.
 */

const f = (key, label, max, def, hint) => ({ key, label, max, default: def, ...(hint ? { hint } : {}) });
const img = (slot, label) => ({ slot, label, accepts: ['image'] });
const vid = (slot, label) => ({ slot, label, accepts: ['video'] });
const any = (slot, label) => ({ slot, label, accepts: ['image', 'video'] });

const SCENES = [
  {
    id: 'opening-logo',
    label: 'Opening Logo',
    fields: [
      f('title', 'Title', 60, 'CHRISLAND UNIVERSITY'),
      f('tagline', 'Tagline', 80, 'Intellectual Radiance'),
    ],
    lists: [],
    media: [vid('heroVideo', 'Intro video (plays behind the title)')],
  },
  {
    id: 'welcome-scene',
    label: 'Welcome',
    fields: [
      f('eyebrow', 'Small heading above the title', 40, 'WELCOME TO'),
      f('title', 'Title', 60, 'CHRISLAND UNIVERSITY'),
      f('tagline', 'Tagline', 100, 'Where Excellence Meets Innovation'),
      f('location1', 'Location line 1', 40, 'Abeokuta'),
      f('location2', 'Location line 2', 40, 'Ogun State'),
      f('location3', 'Location line 3', 40, 'Nigeria'),
      f('website', 'Website address', 80, 'www.chrislanduniversity.edu.ng'),
    ],
    lists: [],
    media: [img('heroImage', 'Background photograph'), img('qrCode', 'QR code image')],
  },
  {
    id: 'vision-mission-values',
    label: 'Vision, Mission & Values',
    fields: [
      f('eyebrow', 'Small heading', 40, 'OUR FOUNDATION'),
      f('heading', 'Heading', 80, 'Vision, Mission & Core Values'),
    ],
    lists: [
      {
        key: 'blocks',
        label: 'Vision, Mission and Core Values',
        variable: false,
        itemNames: ['Vision', 'Mission', 'Core Values'],
        itemFields: [
          { key: 'label', label: 'Label', max: 30 },
          { key: 'text', label: 'Statement', max: 400, long: true },
        ],
        defaults: [
          {
            label: 'VISION',
            text: 'To become a world-class university renowned for intellectual freedom, ethical scholarship, research, and the outstanding training of a new generation of leaders.',
          },
          {
            label: 'MISSION',
            text: 'To create a space that nurtures both sound moral values and intellectual culture, attracting excellent faculty and developing young people who are spiritually strong, intellectually capable, and professionally competent.',
          },
          {
            label: 'CORE VALUES',
            text: 'Intellectual Freedom, Ethical Standards, Research Excellence and Community Service — the four pillars that guide every decision we make.',
          },
        ],
      },
    ],
    media: [
      img('visionImage', 'Image shown with the Vision'),
      img('missionImage', 'Image shown with the Mission'),
      img('coreValuesImage', 'Image shown with the Core Values'),
    ],
  },
  {
    id: 'campus-experience',
    label: 'Campus Experience',
    fields: [
      f('label', 'Small heading', 40, 'CAMPUS EXPERIENCE'),
      f('heading', 'Heading', 80, 'Where Learning Comes Alive'),
      f('body', 'Paragraph', 300, 'A vibrant campus where students learn, connect, and grow into confident leaders — in the classroom and beyond.'),
    ],
    lists: [
      {
        key: 'highlights',
        label: 'Highlights',
        variable: false,
        itemFields: [{ key: 'text', label: 'Highlight', max: 60 }],
        defaults: [
          { text: 'Modern Learning Spaces' },
          { text: 'Safe & Inspiring Environment' },
          { text: 'Active Student Community' },
        ],
      },
    ],
    media: [
      vid('video1', 'Video — top right'),
      vid('video2', 'Video — top left'),
      vid('video3', 'Video — bottom right'),
      vid('video4', 'Video — bottom left'),
    ],
  },
  {
    id: 'academic-programmes',
    label: 'Academic Programmes',
    fields: [
      f('openingLabel', 'Opening — small heading', 40, 'ACADEMICS'),
      f('openingHeading', 'Opening — heading', 80, 'Discover Your Future'),
      f('openingSupporting', 'Opening — supporting line', 100, 'Where curiosity becomes capability.'),
      f('closingHeading', 'Closing — heading', 60, 'SIX PATHS. ONE PURPOSE.'),
      f('closingSupporting', 'Closing — supporting line', 100, 'Preparing students to lead, create and contribute.'),
    ],
    lists: [
      {
        key: 'programmes',
        label: 'Programmes (six cards)',
        variable: false,
        itemNames: ['Sciences', 'Computing', 'Management', 'Arts', 'Law', 'Postgraduate'],
        itemFields: [
          { key: 'title', label: 'Name', max: 50 },
          { key: 'description', label: 'Description', max: 100 },
        ],
        defaults: [
          { title: 'Natural & Applied Sciences', description: 'Research-driven study of the physical world.' },
          { title: 'Computing & Technology', description: 'Software, data and emerging digital systems.' },
          { title: 'Management & Social Sciences', description: 'Business, economics and human society.' },
          { title: 'Arts & Humanities', description: 'Culture, language and creative expression.' },
          { title: 'Law', description: 'Legal scholarship grounded in justice and ethics.' },
          { title: 'Postgraduate Studies', description: 'Advanced research across every discipline.' },
        ],
      },
    ],
    media: [
      any('opening', 'Opening visual'),
      any('sciences', 'Sciences'),
      any('computing', 'Computing'),
      any('management', 'Management'),
      any('arts', 'Arts'),
      any('law', 'Law'),
      any('postgraduate', 'Postgraduate'),
    ],
  },
  {
    id: 'student-life',
    label: 'Student Life',
    fields: [
      f('label', 'Small heading', 40, 'STUDENT LIFE'),
      f('heading', 'Heading', 80, 'More Than a Degree'),
      f(
        'body',
        'Paragraph',
        320,
        'Beyond the classroom, students find mentorship, friendship, and a community that celebrates every achievement. From leadership programmes to student-led societies, campus life at Chrisland shapes well-rounded, confident graduates.'
      ),
    ],
    lists: [
      {
        key: 'highlights',
        label: 'Highlights',
        variable: false,
        itemFields: [{ key: 'title', label: 'Highlight', max: 50 }],
        defaults: [
          { title: 'Leadership Development' },
          { title: 'Clubs & Societies' },
          { title: 'Sports & Recreation' },
          { title: 'Community Engagement' },
        ],
      },
    ],
    media: [
      img('heroImage', 'Background photograph'),
      img('collage1', 'Collage image 1'),
      img('collage2', 'Collage image 2'),
      img('collage3', 'Collage image 3'),
    ],
  },
  {
    id: 'research-innovation',
    label: 'Research & Innovation',
    fields: [
      f('label', 'Small heading', 40, 'RESEARCH & INNOVATION'),
      f('heading', 'Heading', 80, 'Where Ideas Become Innovation'),
      f(
        'body',
        'Paragraph',
        300,
        'Our laboratories, digital classrooms and research centres give students hands-on experience with real-world technology. Faculty-led research and industry partnerships turn curiosity into innovation.'
      ),
    ],
    lists: [
      {
        key: 'highlights',
        label: 'Highlights',
        variable: false,
        itemFields: [{ key: 'title', label: 'Highlight', max: 50 }],
        defaults: [
          { title: 'Smart Learning Spaces' },
          { title: 'Research Excellence' },
          { title: 'Innovation Hub' },
          { title: 'Industry Collaboration' },
        ],
      },
    ],
    media: [
      img('libraryImage', 'Large image (library)'),
      img('labImage', 'Medium image (laboratory)'),
      img('ictImage', 'Small image 1 (ICT)'),
      img('innovationImage', 'Small image 2 (innovation hub)'),
    ],
  },
  {
    id: 'graduate-success',
    label: 'Graduate Success',
    fields: [
      f('label', 'Small heading', 40, 'YOUR FUTURE'),
      f('heading', 'Heading', 80, 'Preparing Leaders for Tomorrow'),
      f(
        'body',
        'Paragraph',
        340,
        'A Chrisland education builds more than credentials — it builds character. Through academic rigour, leadership training and entrepreneurial thinking, our graduates step confidently into careers, startups and communities that need what they can offer.'
      ),
    ],
    lists: [
      {
        key: 'milestones',
        label: 'Timeline milestones (four)',
        variable: false,
        itemFields: [
          { key: 'title', label: 'Title', max: 40 },
          { key: 'description', label: 'Description', max: 100 },
        ],
        defaults: [
          { title: 'Admission', description: 'A welcoming start into a rigorous academic community.' },
          { title: 'Learning', description: 'Hands-on scholarship across modern faculties and labs.' },
          { title: 'Leadership', description: 'Mentorship and student leadership shape confident voices.' },
          { title: 'Career Success', description: 'Graduates ready for careers, startups and impact.' },
        ],
      },
      {
        key: 'achievements',
        label: 'Achievement highlights (three)',
        variable: false,
        itemFields: [{ key: 'title', label: 'Highlight', max: 50 }],
        defaults: [
          { title: 'Career Readiness' },
          { title: 'Leadership Development' },
          { title: 'Lifelong Learning' },
        ],
      },
    ],
    media: [img('heroImage', 'Background photograph')],
  },
  {
    id: 'admissions',
    label: 'Admissions',
    fields: [
      f('label', 'Small heading', 40, 'ADMISSIONS'),
      f('heading', 'Heading', 80, 'Begin Your Journey With Chrisland'),
      f(
        'body',
        'Paragraph',
        300,
        'Joining Chrisland University is simple and supportive from the very first step. Our admissions team is here to guide you through every stage, from choosing a programme to settling into campus life.'
      ),
      f('ctaLabel', 'Contact box title', 40, 'Admissions Office'),
    ],
    lists: [
      {
        key: 'contacts',
        label: 'Admissions contact details (three)',
        variable: false,
        itemFields: [
          { key: 'label', label: 'Label', max: 30 },
          { key: 'value', label: 'Value', max: 80 },
        ],
        defaults: [
          { label: 'Email', value: 'admissions@chrisland.edu.ng' },
          { label: 'Phone', value: '+234 XXX XXX XXXX' },
          { label: 'Website', value: 'www.chrislanduniversity.edu.ng' },
        ],
      },
      {
        key: 'steps',
        label: 'Journey steps (four)',
        variable: false,
        itemFields: [
          { key: 'title', label: 'Title', max: 50 },
          { key: 'description', label: 'Description', max: 100 },
        ],
        defaults: [
          { title: 'Choose Your Programme', description: 'Explore our faculties and find the path that fits you.' },
          { title: 'Submit Your Application', description: 'Complete a simple online application in minutes.' },
          { title: 'Receive Admission Decision', description: 'Our admissions team reviews and responds promptly.' },
          { title: 'Begin Your Academic Journey', description: 'Register, settle in, and start building your future.' },
        ],
      },
    ],
    media: [],
  },
  {
    id: 'contact',
    label: 'Contact',
    fields: [
      f('label', 'Small heading', 40, 'CONTACT US'),
      f('heading', 'Heading', 80, "Let's Build Your Future Together"),
      f(
        'body',
        'Paragraph',
        300,
        'Have a question, or ready to visit campus? Our team is here to help prospective students and parents every step of the way. Reach out — we would love to welcome you to Chrisland.'
      ),
      f('qrLabel', 'Text under the QR code', 40, 'SCAN TO LEARN MORE'),
    ],
    lists: [
      {
        key: 'contactRows',
        label: 'Contact details',
        variable: true,
        min: 1,
        max: 5, // 6 rows overflow the Contact scene at 1920x1080 (measured)
        // Measured at 1920x1080: a value longer than ~28 characters wraps to a second line, and
        // the column holds at most 7 lines in total (the built-in rows use exactly 7).
        lineBudget: { field: 'value', charsPerLine: 28, totalLines: 7 },
        itemFields: [
          { key: 'label', label: 'Label', max: 30 },
          { key: 'value', label: 'Value', max: 80 },
        ],
        defaults: [
          { label: 'Website', value: 'www.chrislanduniversity.edu.ng' },
          { label: 'Admissions Email', value: 'admissions@chrisland.edu.ng' },
          { label: 'General Email', value: 'info@chrisland.edu.ng' },
          { label: 'Telephone', value: '+234 XXX XXX XXXX' },
          { label: 'Campus Address', value: 'Chrisland University, Abeokuta, Ogun State, Nigeria' },
        ],
      },
      {
        key: 'socialLinks',
        label: 'Social media',
        variable: true,
        min: 0,
        max: 4, // 6 overflow the right-hand column at 1920x1080 (measured)
        itemFields: [{ key: 'label', label: 'Name', max: 30 }],
        defaults: [
          { label: 'Facebook' },
          { label: 'Instagram' },
          { label: 'LinkedIn' },
          { label: 'YouTube' },
        ],
      },
    ],
    media: [img('qrCode', 'QR code image')],
  },
];

/**
 * Layout-fit limits (Phase 16). The ten scenes have fixed layouts tuned to
 * their current wording, so a field may only grow as far as the layout still
 * fits. Each value is a growth factor over the LONGEST built-in text of that
 * field (for list items: the longest item). It comes from rendering every
 * field at increasing lengths at 1280x720 and 1920x1080 and taking the largest
 * length that caused no overflow or clipping at either size, less a safety
 * margin (0.05), and capped at 1.1 so that combinations of long fields still fit.
 * Below 1.0 means a field is limited to under today's longest wording (Contact's
 * detail rows, which wrap). 1.0 means "no longer than today's wording".
 * Key: '<scene>.<field>' or '<scene>.<list>.<itemField>'.
 */
const FIT = {
  'opening-logo.title': 1.1,
  'opening-logo.tagline': 1.1,
  'welcome-scene.eyebrow': 1.1,
  'welcome-scene.title': 1.1,
  'welcome-scene.tagline': 1.1,
  'welcome-scene.location1': 1.4,
  'welcome-scene.location2': 1.4,
  'welcome-scene.location3': 1.4,
  'welcome-scene.website': 1.1,
  'vision-mission-values.eyebrow': 1.1,
  'vision-mission-values.heading': 1.1,
  'vision-mission-values.blocks.label': 1.1,
  'vision-mission-values.blocks.text': 1.1,
  'campus-experience.label': 1.1,
  'campus-experience.heading': 1.1,
  'campus-experience.body': 1.1,
  'campus-experience.highlights.text': 1.1,
  'academic-programmes.openingLabel': 1.1,
  'academic-programmes.openingHeading': 1.1,
  'academic-programmes.openingSupporting': 1.1,
  'academic-programmes.closingHeading': 1.1,
  'academic-programmes.closingSupporting': 1.1,
  'academic-programmes.programmes.title': 1.1,
  'academic-programmes.programmes.description': 1.1,
  'student-life.label': 1.0,
  'student-life.heading': 1.05,
  'student-life.body': 1.0,
  'student-life.highlights.title': 1.05,
  'research-innovation.label': 1.0,
  'research-innovation.heading': 1.1,
  'research-innovation.body': 1.1,
  'research-innovation.highlights.title': 1.1,
  'graduate-success.label': 1.05,
  'graduate-success.heading': 1.05,
  'graduate-success.body': 1.0,
  'graduate-success.milestones.title': 1.05,
  'graduate-success.milestones.description': 1.05,
  'graduate-success.achievements.title': 1.05,
  'admissions.label': 1.05,
  'admissions.heading': 1.05,
  'admissions.body': 1.0,
  'admissions.ctaLabel': 1.05,
  'admissions.contacts.label': 1.05,
  'admissions.contacts.value': 1.0,
  'admissions.steps.title': 1.0,
  'admissions.steps.description': 1.0,
  'contact.label': 1.0,
  'contact.heading': 1.0,
  'contact.body': 1.0,
  'contact.qrLabel': 1.0,
  'contact.contactRows.label': 1.0,
  'contact.contactRows.value': 1.0,
  'contact.socialLinks.label': 1.0,
};

function applyFitLimits(scenes) {
  const longest = (values) => values.reduce((m, v) => Math.max(m, [...v].length), 0);
  scenes.forEach((scene) => {
    scene.fields.forEach((fld) => {
      const factor = FIT[`${scene.id}.${fld.key}`] ?? 1.0;
      fld.max = Math.min(fld.max, Math.floor(longest([fld.default]) * factor));
    });
    scene.lists.forEach((list) => {
      list.itemFields.forEach((fld) => {
        const factor = FIT[`${scene.id}.${list.key}.${fld.key}`] ?? 1.0;
        fld.max = Math.min(fld.max, Math.floor(longest(list.defaults.map((d) => d[fld.key])) * factor));
      });
    });
  });
}
applyFitLimits(SCENES);

const BY_ID = new Map(SCENES.map((s) => [s.id, s]));

module.exports = {
  SCENES,
  getSceneSchema: (id) => BY_ID.get(id) || null,
};

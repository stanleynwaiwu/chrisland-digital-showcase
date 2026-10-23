/* ============================================================
   JS/MEDIA-LIBRARY.JS
   Single source of truth for every image and video path used
   anywhere in the Chrisland Experience presentation. Scenes
   import MEDIA_LIBRARY instead of hardcoding file paths, so
   swapping a placeholder for a real asset — or wiring up the
   future admin panel — only ever touches this one file.

   Paths are unchanged from what each scene previously hardcoded.
   Every entry that has no image yet keeps an empty string rather
   than being omitted, so the shape stays predictable for every
   scene.
   ============================================================ */

export const MEDIA_LIBRARY = {
  openingLogo: {
    heroVideo: 'assets/videos/branding/opening-logo.mp4',
    heroImage: '',
    description:
      'Pre-rendered animated logo intro video, ~5s, muted, plays once. Replaces the previously generated logo reveal animation.',
  },

  welcome: {
    heroImage: 'assets/images/welcome-campus-placeholder.png',
    heroVideo: '',
    qrCode: 'assets/images/contact/chrisland-website-qr.png',
    description:
      'Wide panoramic photograph of Chrisland University Abeokuta campus during a bright sunny morning with students walking naturally across the campus. Landscape orientation. Premium quality.',
  },

  visionMission: {
    visionImage: 'assets/images/vision-mission-vision-placeholder.jpg',
    missionImage: 'assets/images/vision-mission-mission-placeholder.jpg',
    coreValuesImage: 'assets/images/vision-mission-corevalues-placeholder.jpg',
    description:
      'Three photographs sharing one editorial frame, revealed via a card-turn as the scene moves from Vision to Mission to Core Values. Vision/Mission: students collaborating in a bright learning environment with lecturers providing guidance. Core Values: a representative academic-life moment. Natural lighting, premium academic atmosphere throughout.',
  },

  campusExperience: {
    video1: 'assets/videos/campus/campus-video-top-right.mp4',
    video2: 'assets/videos/campus/campus-video-top-left.mp4',
    video3: 'assets/videos/campus/campus-video-bottom-right.mp4',
    video4: 'assets/videos/campus/campus-video-bottom-left.mp4',
    description:
      'Four-window campus-life composition (2×2): video1=top-right, video2=top-left, video3=bottom-right, video4=bottom-left. Each loops independently and continuously once introduced, regardless of its own source length, until the scene exits.',
  },

  academicProgrammes: {
    opening: {
      mediaType: 'image',
      mediaPath: 'assets/images/academics/academics-opening-placeholder.jpg',
      mediaDescription:
        'Cinematic academic visual establishing mood — students engaged in focused study or discussion, premium natural lighting.',
    },

    computing: {
      mediaType: 'image',
      mediaPath: 'assets/images/academics/computing-placeholder.jpg',
      mediaDescription:
        'Modern computing / ICT learning environment — students working with technology.',
    },

    sciences: {
      mediaType: 'image',
      mediaPath: 'assets/images/academics/sciences-placeholder.jpg',
      mediaDescription:
        'Laboratory or scientific learning setting — hands-on natural and applied sciences.',
    },

    management: {
      mediaType: 'image',
      mediaPath: 'assets/images/academics/management-placeholder.jpg',
      mediaDescription:
        'Business, leadership and collaborative learning — management and social sciences.',
    },

    arts: {
      mediaType: 'image',
      mediaPath: 'assets/images/academics/arts-placeholder.jpg',
      mediaDescription:
        'Creative, cultural and academic imagery representing arts and humanities.',
    },

    law: {
      mediaType: 'image',
      mediaPath: 'assets/images/academics/law-placeholder.jpg',
      mediaDescription:
        'Legal education imagery — courtroom or legal study setting.',
    },

    postgraduate: {
      mediaType: 'image',
      mediaPath: 'assets/images/academics/postgraduate-placeholder.jpg',
      mediaDescription:
        'Advanced research and postgraduate study — academic excellence.',
    },

    description:
      'Media set for the multi-movement Academic Programmes scene: one opening visual plus one dedicated visual per programme. Each entry supports either an image or a video (mediaType) so real assets can be dropped in later without touching the scene code.',
  },

  studentLife: {
    heroImage: 'assets/images/student-life-placeholder.jpg',
    collage1: 'assets/images/student-life-collage-1-placeholder.jpg',
    collage2: 'assets/images/student-life-collage-2-placeholder.jpg',
    collage3: 'assets/images/student-life-collage-3-placeholder.jpg',
    heroVideo: '',
    description:
      'A vibrant university campus scene showing students collaborating, attending events, participating in sports, cultural activities and enjoying campus life in a bright, welcoming environment.',
  },

  researchInnovation: {
    libraryImage: 'assets/images/facility-library-placeholder.jpg',
    labImage: 'assets/images/facility-lab-placeholder.jpg',
    ictImage: 'assets/images/facility-ict-placeholder.jpg',
    innovationImage: 'assets/images/facility-innovation-placeholder.png',
    heroVideo: '',
    description:
      'Four-image mosaic covering the library, a teaching laboratory, the ICT laboratory, and the student innovation hub.',
  },

  graduateSuccess: {
    heroImage: 'assets/images/graduate-success-placeholder.jpg',
    heroVideo: '',
    description:
      'A diverse group of graduating university students celebrating their achievements while preparing for future careers.',
  },

  admissions: {
    heroImage: '',
    heroVideo: '',
    description:
      'No image in this scene by design — reserved for future media support.',
  },

  contact: {
    heroImage: '',
    heroVideo: '',

    // Official QR asset used by the final Contact scene.
    // Replace the PNG in this location without changing contact.js.
    qrCode: 'assets/images/contact/chrisland-website-qr.png',

    description:
      'Final contact scene media. The QR code links visitors to the Chrisland University website.',
  },
};
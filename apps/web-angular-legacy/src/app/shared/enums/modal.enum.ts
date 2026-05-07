export enum ModalNameEnum {
  // Authentication Modals
  Signin = 'Signin',
  Register = 'Register',
  ActivateUser = 'ActivateUser',
  // Memorial
  CreateMemorial = 'CreateMemorial',
  EditMemorial = "EditMemorial",
  AdminMemorial = "AdminMemorial",
  // Testimona
  CreateTestimona = 'CreateTestimona',
  EditTestimona = 'EditTestimona',
  // Funeral
  CreateFuneral = 'CreateFuneral',
  EditFuneral = 'EditFuneral',
  // Funeral Event
  CreateFuneralEvent = 'CreateFuneralEvent',
  EditFuneralEvent = 'EditFuneralEvent',
  // Biography
  CreateBiography = 'CreateBiography',
  EditBiography = "EditBiography",
  // Chapter
  CreateChapter = 'CreateChapter',
  EditChapter = "EditChapter",
  // Photo
  AddPhoto = 'AddPhoto',
  // Testimona Home
  CreateTestimonaHome = 'CreateTestimonaHome',
  // Donation
  AddDonation = 'AddDonation',
  UpdateGoalDonation = 'UpdateGoalDonation',
  SuccessDonation = 'SuccessDonation',
  FailedDonation = 'FailedDonation',
}

export enum ModalStateEnum {
  Opened = 'Opened',
  Closed = 'Closed',
  ClosedAndRedirect = 'ClosedAndRedirect',
  ClosedAndRefreshed = 'ClosedAndRefreshed',
  ClosedAndReOpen = 'ClosedAndReOpen'
}

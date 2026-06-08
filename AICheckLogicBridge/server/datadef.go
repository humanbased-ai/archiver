package server

type File struct {
	Path     string `json:"path"`
	Filename string `json:"filename"`
}

type Evidence struct {
	Text        string  `json:"text,omitempty"`
	Files       []*File `json:"files,omitempty"`
	Hash        string  `json:"hash,omitempty"`
	Link        string  `json:"link,omitempty"`
	Translation string  `json:"translation,omitempty"`
	ImageTags   []int   `json:"imageTags,omitempty"`
	Web3Related []bool  `json:"web3Related,omitempty"`
}

type Submission struct {
	Address  string `json:"address"`
	Network  string `json:"network"`
	Entity   string `json:"entity"`
	Evidence string `json:"evidence"`
	Text     string `json:"text"`
}

type Reason struct {
	Address string `json:"address"`
	Network string `json:"network"`
	Entity  string `json:"entity"`
	Reason  string `json:"reason"`
}

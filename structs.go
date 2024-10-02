package main

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type IntBoolTuple struct {
	Key   int  `json:"key"`
	Value bool `json:"value"`
}

type StringBoolTuple struct {
	Key   string `json:"key"`
	Value bool   `json:"value"`
}

type IndexStringBoolTriple struct {
	Index    int    `json:"index"`
	Username string `json:"username"`
	Shared   bool   `json:"shared"`
}

type IndexStringTuple struct {
	Index   int    `json:"index"`
	Payload string `json:"payload"`
}

type GenericPayload struct {
	Payload string `json:"payload"`
}

type ListViewRow struct {
	ListID int    `json:"listid"`
	Name   string `json:"name"`
}

type ListItem struct {
	ItemID  int    `json:"itemid"`
	Content string `json:"content"`
}

package main

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
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

import { createContext, PropsWithChildren, useEffect, useState } from "react";
import { useChatbotSocket } from "./chatbot-socket-provider";

export type Contact = {
  id: string;
  displayName: string;
  contactAvatar: string;
  statusMessage: string;
  typing?: boolean;
};

export type Contacts = {
  contacts: Contact[];
  dictionary: [string, Contact[]][];
  isLoading: boolean;
  filteredContacts: Contact[];
  search: string;
};

export type ContactsContextType = Contacts & {
  filterContacts: (search: string) => void;
  getContact: (id: string) => Contact | undefined;
  setIsContactTyping: (id: string, typing: boolean) => void;
  addContact: (contact: Contact) => void;
};

export const ContactsContext = createContext<ContactsContextType | undefined>(
  undefined
);

export default function ContactsProvider({ children }: PropsWithChildren) {
  const [contacts, setContacts] = useState<Contacts>({
    contacts: [],
    dictionary: [["", []]],
    isLoading: false,
    filteredContacts: [],
    search: "",
  });

  const generateDictionary = (
    data: Contacts["contacts"]
  ): [string, Contact[]][] => {
    const map: Map<string, Contact[]> = new Map();
    data
      .sort((a: Contact, b: Contact) =>
        a.displayName.localeCompare(b.displayName)
      )
      .forEach((contact: Contact) => {
        const firstLetter = contact.displayName.charAt(0);
        if (map.has(firstLetter)) {
          const existing = map.get(firstLetter);
          existing?.push(contact);
          if (existing) {
            map.set(firstLetter, existing);
          }
        } else {
          map.set(firstLetter, [contact]);
        }
      });
    return Array.from(map);
  };

  useEffect(() => {
    setContacts((prev) => {
      const contacts = prev.contacts;
      const search = prev.search;
      const filteredContacts = contacts.filter((contact: Contact) =>
        contact.displayName.includes(search)
      );
      const dictionary = generateDictionary(filteredContacts);

      return {
        ...prev,
        filteredContacts,
        dictionary,
      };
    });
  }, [contacts.search]);

  const filterContacts = (search: string) => {
    setContacts((prev) => ({
      ...prev,
      search,
    }));
  };

  const getContact = (id: string) => {
    let ctcts = contacts.contacts;
    if (contacts.filteredContacts.length > 0) {
      ctcts = contacts.filteredContacts;
    }
    const contact = ctcts.find((contact: Contact) => contact.id === id);
    return contact;
  };

  const addContact = (contact: Contact) => {
    setContacts((prev) => {
      if (prev.contacts.some((c) => c.id === contact.id)) return prev;
      const updated = [contact, ...prev.contacts];
      return { ...prev, contacts: updated, filteredContacts: updated };
    });
  };

  const setIsContactTyping = (id: string, typing: boolean) => {
    const contactIndex = contacts.contacts.findIndex(
      (contact: Contact) => contact.id === id
    );
    if (contactIndex) {
      const updatedContacts = [...contacts.contacts];
      updatedContacts[contactIndex].typing = typing;
      setContacts((prev) => ({
        ...prev,
        contacts: [...updatedContacts],
      }));
    }
  };

  return (
    <ContactsContext.Provider
      value={{ ...contacts, filterContacts, getContact, setIsContactTyping, addContact }}
    >
      {children}
    </ContactsContext.Provider>
  );
}

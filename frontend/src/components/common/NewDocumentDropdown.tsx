import { useState, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { PlusIcon, ChevronDownIcon, DocumentDuplicateIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import TransferFromDialog from './TransferFromDialog';

interface NewDocumentDropdownProps {
  onNewBlank: () => void;
  onTransferFrom: (document: any) => void;
  documentType: 'sales' | 'purchases';
  targetType: string;
  canTransferFrom?: boolean;
}

export default function NewDocumentDropdown({
  onNewBlank,
  onTransferFrom,
  documentType,
  targetType,
  canTransferFrom = true,
}: NewDocumentDropdownProps) {
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  // Document types that can be transferred from
  const transferableTargets = documentType === 'sales' 
    ? ['order', 'do', 'invoice']
    : ['grn', 'invoice'];

  const showTransferOption = canTransferFrom && transferableTargets.includes(targetType);

  if (!showTransferOption) {
    // Simple button for non-transferable types
    return (
      <button onClick={onNewBlank} className="btn btn-primary">
        <PlusIcon className="w-5 h-5 mr-2" />
        New
      </button>
    );
  }

  return (
    <>
      <Menu as="div" className="relative inline-block text-left">
        <Menu.Button className="btn btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          New
          <ChevronDownIcon className="w-4 h-4 ml-2" />
        </Menu.Button>
        
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-none z-50 overflow-hidden">
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onNewBlank}
                    className={`${
                      active ? 'bg-gray-100 dark:bg-slate-700' : ''
                    } group flex w-full items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300`}
                  >
                    <DocumentPlusIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-indigo-500" />
                    New Blank Document
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => setTransferDialogOpen(true)}
                    className={`${
                      active ? 'bg-gray-100 dark:bg-slate-700' : ''
                    } group flex w-full items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300`}
                  >
                    <DocumentDuplicateIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-indigo-500" />
                    Transfer from Document
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>

      <TransferFromDialog
        isOpen={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
        onSelect={onTransferFrom}
        documentType={documentType}
        targetType={targetType}
      />
    </>
  );
}
